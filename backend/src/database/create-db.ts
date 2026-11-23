import 'reflect-metadata';
import { DataSource } from 'typeorm';

const ds = new DataSource({ 
  type: 'postgres', 
  host: 'localhost', 
  port: 5433, 
  username: 'postgres', 
  password: 'postgres', 
  database: 'postgres' 
});

async function createDb() {
  await ds.initialize();
  await ds.query('CREATE DATABASE library');
  console.log('Database created');
  await ds.destroy();
  process.exit(0);
}

createDb().catch(e => { console.error(e); process.exit(1); });