import { neon } from "https://esm.sh/@neondatabase/serverless";

// Connection String Neon PostgreSQL
const connectionString = "postgresql://neondb_owner:npg_o3iR4ANwckWh@ep-still-frost-aos4ozvz-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(connectionString);

export { sql };
