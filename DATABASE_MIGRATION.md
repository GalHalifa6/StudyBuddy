# Database Migration Guide: H2 to PostgreSQL

This guide will help you migrate your StudyBuddy application from H2 database to PostgreSQL before deployment.

## Prerequisites

- PostgreSQL 12+ installed locally (or use Docker)
- Access to your existing H2 database file (`./data/studybuddy.mv.db`)
- Java 17+ and Maven (for running the application)

## Option 1: Using Docker (Recommended)

The easiest way to set up PostgreSQL is using Docker Compose, which is already configured in your project.

### Step 1: Start PostgreSQL with Docker Compose

```bash
# Start only the PostgreSQL service
docker-compose up -d postgres

# Verify PostgreSQL is running
docker-compose ps
```

### Step 2: Verify PostgreSQL Connection

```bash
# Connect to PostgreSQL container
docker exec -it studybuddy-db psql -U studybuddy -d studybuddy

# You should see the PostgreSQL prompt
# Type \q to exit
```

### Step 3: Update Application Configuration

The application is already configured to use PostgreSQL. The configuration in `application.properties` now defaults to PostgreSQL and can be overridden with environment variables.

**For Docker deployment:**
- The `docker-compose.yml` already has PostgreSQL configured
- Just run `docker-compose up` and it will use PostgreSQL automatically

**For local development:**
- Make sure PostgreSQL is running on `localhost:5432`
- The default credentials are:
  - Database: `studybuddy`
  - Username: `studybuddy`
  - Password: `studybuddy_password`

### Step 4: Migrate Data from H2 to PostgreSQL

#### Method A: Using H2 Console (Manual Export/Import)

1. **Export data from H2:**
   - Start your application with H2 configuration temporarily
   - Access H2 Console: http://localhost:8080/h2-console
   - JDBC URL: `jdbc:h2:file:./data/studybuddy`
   - Username: `sa`
   - Password: (empty)
   - Export each table as CSV or SQL

2. **Import to PostgreSQL:**
   - Connect to PostgreSQL
   - Import the exported data

#### Method B: Using Hibernate Auto-Create (Recommended for Fresh Start)

If you're okay with recreating the schema (data will be lost):

1. **Backup your H2 data** (if needed):
   ```bash
   cp ./data/studybuddy.mv.db ./data/studybuddy.mv.db.backup
   ```

2. **Start the application with PostgreSQL:**
   ```bash
   # Make sure PostgreSQL is running
   docker-compose up -d postgres
   
   # Start the backend
   mvn spring-boot:run
   ```

3. **Hibernate will automatically create the schema** in PostgreSQL on first run (because `spring.jpa.hibernate.ddl-auto=update`)

4. **Re-enter your data** through the application or API

#### Method C: Using Database Migration Tool (Advanced)

For production data migration, consider using a tool like:
- **pgLoader**: Can migrate from H2 to PostgreSQL
- **DBeaver**: Universal database tool with migration features
- **Custom script**: Write a Java/Spring Boot migration script

## Option 2: Local PostgreSQL Installation

### Step 1: Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Install and remember the postgres user password

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database and User

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database and user
CREATE DATABASE studybuddy;
CREATE USER studybuddy WITH PASSWORD 'studybuddy_password';
GRANT ALL PRIVILEGES ON DATABASE studybuddy TO studybuddy;
\q
```

### Step 3: Configure Application

The application is already configured to use PostgreSQL. For local development, you can either:

**Option A: Use environment variables**
```bash
# Windows PowerShell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/studybuddy"
$env:SPRING_DATASOURCE_USERNAME="studybuddy"
$env:SPRING_DATASOURCE_PASSWORD="studybuddy_password"

# Then run
mvn spring-boot:run
```

**Option B: Update application.properties directly**
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/studybuddy
spring.datasource.username=studybuddy
spring.datasource.password=studybuddy_password
```

### Step 4: Run Application

```bash
mvn spring-boot:run
```

Hibernate will automatically create the schema in PostgreSQL on first run.

## Verification

### Check PostgreSQL Tables

```bash
# Connect to PostgreSQL
docker exec -it studybuddy-db psql -U studybuddy -d studybuddy

# List all tables
\dt

# Check a specific table
SELECT * FROM users LIMIT 5;

# Exit
\q
```

### Test Application

1. Start the application
2. Access the API: http://localhost:8080/api
3. Try registering a new user
4. Verify data is being saved to PostgreSQL

## Environment Variables

For Docker deployment, the following environment variables are used (already configured in `docker-compose.yml`):

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/studybuddy
SPRING_DATASOURCE_USERNAME=studybuddy
SPRING_DATASOURCE_PASSWORD=studybuddy_password
SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver
SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.PostgreSQLDialect
SPRING_JPA_HIBERNATE_DDL_AUTO=update
```

## Troubleshooting

### Connection Refused

**Problem:** Cannot connect to PostgreSQL

**Solutions:**
- Verify PostgreSQL is running: `docker-compose ps` or `pg_isready`
- Check connection string matches your setup
- Verify firewall/network settings

### Authentication Failed

**Problem:** Username/password incorrect

**Solutions:**
- Verify credentials in `docker-compose.yml` or `.env` file
- Check PostgreSQL user exists: `docker exec -it studybuddy-db psql -U postgres -c "\du"`

### Schema Creation Issues

**Problem:** Tables not being created

**Solutions:**
- Check `spring.jpa.hibernate.ddl-auto=update` is set
- Verify database user has CREATE privileges
- Check application logs for errors

### Data Migration Issues

**Problem:** Data not migrated correctly

**Solutions:**
- Use H2 Console to export data before migration
- Consider using a database migration tool
- For fresh deployments, let Hibernate recreate schema

## Next Steps

1. ✅ Application is now configured for PostgreSQL
2. ✅ Docker Compose is ready for deployment
3. ⚠️ **Backup your H2 data** if you need to preserve it
4. ⚠️ **Test the application** with PostgreSQL before deployment
5. ⚠️ **Update production environment variables** with secure credentials

## Production Deployment

For production deployment:

1. **Use a managed PostgreSQL service** (AWS RDS, Azure Database, Google Cloud SQL, etc.)
2. **Set secure credentials** via environment variables
3. **Enable SSL/TLS** for database connections
4. **Set up automated backups**
5. **Use connection pooling** (already configured in Spring Boot)
6. **Monitor database performance**

Update your production `.env` or environment variables:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://your-production-db-host:5432/studybuddy
SPRING_DATASOURCE_USERNAME=your_production_user
SPRING_DATASOURCE_PASSWORD=your_secure_password
```

## Notes

- The H2 database file (`./data/studybuddy.mv.db`) is no longer used
- You can delete it after successful migration, or keep it as a backup
- H2 Console is disabled in the new configuration
- All data will be stored in PostgreSQL, which is persistent and suitable for production

