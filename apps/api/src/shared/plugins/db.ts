import { Elysia } from 'elysia';
import { db } from '../database';

export const dbPlugin = new Elysia({ name: 'database' }).decorate('db', db);
