import type { Database } from '../../shared/database';
import {
  AccountLockedError,
  ForbiddenError,
  UnauthorizedError,
} from '../../shared/errors';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import { generateRefreshToken, hashToken } from '../../shared/utils/token';
import { generateId } from '../../shared/utils/uuid';
import { AuthRepository } from './auth.repository';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7);

type LoginParams = {
  email: string;
  password: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
  signAccessToken: (payload: Record<string, string>) => Promise<string>;
};

type RefreshParams = {
  refreshToken: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
  signAccessToken: (payload: Record<string, string>) => Promise<string>;
};

export class AuthService {
  private readonly repo: AuthRepository;

  constructor(db: Database) {
    this.repo = new AuthRepository(db);
  }

  async login({ email, password, ipAddress, userAgent, signAccessToken }: LoginParams) {
    const user = await this.repo.findUserByEmail(email);

    // Identical error message for not-found and wrong-password to prevent user enumeration
    if (!user) throw new UnauthorizedError('Invalid email or password');

    if (!user.isActive) throw new ForbiddenError('Account is inactive');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      throw new AccountLockedError(retryAfter);
    }

    const passwordValid = await verifyPassword(user.passwordHash, password);

    if (!passwordValid) {
      await this.repo.incrementLoginAttempts(user.id);

      if (user.failedLoginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await this.repo.lockAccount(user.id, lockUntil);
      }

      throw new UnauthorizedError('Invalid email or password');
    }

    await this.repo.resetLoginAttempts(user.id);

    const accessToken = await signAccessToken({ sub: user.id, email: user.email });
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    await this.repo.createRefreshToken({
      id: generateId(),
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: user.id,
      action: 'user.login',
      targetType: 'user',
      targetId: user.id,
      payload: { ipAddress },
      ipAddress,
    });

    const userRoles = await this.repo.getUserRoles(user.id);

    return {
      accessToken,
      rawRefreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, roles: userRoles },
    };
  }

  async refresh({ refreshToken, ipAddress, userAgent, signAccessToken }: RefreshParams) {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.repo.findActiveRefreshToken(tokenHash);

    if (!stored) throw new UnauthorizedError('Invalid or expired refresh token');

    const user = await this.repo.findUserById(stored.userId);
    if (!user) throw new UnauthorizedError();
    if (!user.isActive) throw new ForbiddenError('Account is inactive');

    // Rotate: revoke old, issue new
    await this.repo.revokeRefreshToken(stored.id);

    const accessToken = await signAccessToken({ sub: user.id, email: user.email });
    const newRawToken = generateRefreshToken();
    const newTokenHash = hashToken(newRawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    await this.repo.createRefreshToken({
      id: generateId(),
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: user.id,
      action: 'user.token_refreshed',
      targetType: 'user',
      targetId: user.id,
      payload: { ipAddress },
      ipAddress,
    });

    return { accessToken, rawRefreshToken: newRawToken };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;

    const tokenHash = hashToken(refreshToken);
    const stored = await this.repo.findActiveRefreshToken(tokenHash);
    if (!stored) return;

    await this.repo.revokeRefreshToken(stored.id);

    await this.repo.createAuditLog({
      id: generateId(),
      actorId: stored.userId,
      action: 'user.logout',
      targetType: 'user',
      targetId: stored.userId,
      ipAddress: undefined,
    });
  }
}
