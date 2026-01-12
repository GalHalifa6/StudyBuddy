# Docker Setup Guide for StudyBuddy

This guide explains how to use Docker with your StudyBuddy project.

## 📋 Prerequisites

1. **Install Docker Desktop** (if not already installed):
   - Windows: Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
   - Mac: Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
   - Linux: Follow instructions at [docs.docker.com/engine/install](https://docs.docker.com/engine/install/)

2. **Verify Docker installation**:
   ```bash
   docker --version
   docker-compose --version
   ```

## 🚀 Quick Start

### Option 1: Using Docker Compose (Recommended)

This will start the database, backend, and frontend together:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **PostgreSQL Database**: localhost:5432
- **H2 Console** (if enabled): http://localhost:8080/h2-console

### Option 2: Build and Run Individual Services

```bash
# Build only backend
docker build -t studybuddy-backend .

# Build only frontend
docker build -t studybuddy-frontend ./frontend

# Run backend only
docker run -p 8080:8080 studybuddy-backend

# Run frontend only (requires backend to be running)
docker run -p 3000:80 studybuddy-frontend
```

**Note**: It's recommended to use `docker-compose` to run all services together.

## 🔧 Configuration

### Environment Variables

**Step 1**: Copy the example environment file:
```bash
# Windows PowerShell
Copy-Item env.example .env

# Linux/Mac
cp env.example .env
```

**Step 2**: Edit the `.env` file and fill in your actual values:
- Open `.env` in a text editor
- Uncomment and fill in the values you need
- At minimum, change `JWT_SECRET` for security

**Step 3**: Run Docker Compose (it will automatically load `.env`):
```bash
docker-compose up --build
```

**Important Variables:**
- `JWT_SECRET` - **REQUIRED**: Change this to a secure random string in production
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google OAuth login
- `SENDGRID_API_KEY` - For email notifications
- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:8080)
- `VITE_WS_BASE_URL` - WebSocket URL (default: ws://localhost:8080)
- `FRONTEND_PORT` - Frontend port (default: 3000)

### Using H2 Database Instead of PostgreSQL

If you want to use H2 (file-based) instead of PostgreSQL, modify `docker-compose.yml`:

1. Comment out or remove the `postgres` service
2. Update backend environment variables:
   ```yaml
   SPRING_DATASOURCE_URL: jdbc:h2:file:/app/data/studybuddy
   SPRING_DATASOURCE_DRIVER_CLASS_NAME: org.h2.Driver
   SPRING_JPA_DATABASE_PLATFORM: org.hibernate.dialect.H2Dialect
   ```
3. Remove the `depends_on: postgres` section

## 📝 Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data!)
docker-compose down -v
```

### Restart Services
```bash
docker-compose restart
```

### Rebuild After Code Changes
```bash
# Rebuild and restart
docker-compose up --build

# Or rebuild specific service
docker-compose build backend
docker-compose build frontend
docker-compose up -d
```

### Access Container Shell
```bash
# Backend container
docker exec -it studybuddy-backend sh

# Frontend container
docker exec -it studybuddy-frontend sh

# Database container
docker exec -it studybuddy-db psql -U studybuddy -d studybuddy
```

### Check Running Containers
```bash
docker ps
```

## 🗄️ Database Management

### Access PostgreSQL
```bash
# Using docker exec
docker exec -it studybuddy-db psql -U studybuddy -d studybuddy

# Or connect from host using any PostgreSQL client
# Host: localhost
# Port: 5432
# Database: studybuddy
# Username: studybuddy
# Password: studybuddy_password
```

### Backup Database
```bash
docker exec studybuddy-db pg_dump -U studybuddy studybuddy > backup.sql
```

### Restore Database
```bash
docker exec -i studybuddy-db psql -U studybuddy studybuddy < backup.sql
```

## 📁 Data Persistence

Data is stored in Docker volumes:
- **PostgreSQL data**: `postgres_data` volume
- **File uploads**: `uploads_data` volume
- **H2 database files**: `./data` directory (mounted from host)

To backup volumes:
```bash
docker run --rm -v studybuddy_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

## 🐛 Troubleshooting

### Port Already in Use
If port 8080 or 5432 is already in use:
1. Stop the conflicting service, OR
2. Change ports in `docker-compose.yml`:
   ```yaml
   ports:
     - "8081:8080"  # Change host port
   ```

### Database Connection Issues
- Ensure PostgreSQL container is healthy: `docker-compose ps`
- Check logs: `docker-compose logs postgres`
- Verify environment variables match database credentials

### Build Failures
- Clear Docker cache: `docker system prune -a`
- Rebuild without cache: `docker-compose build --no-cache`

### Permission Issues (Linux/Mac)
If you get permission errors:
```bash
sudo chown -R $USER:$USER ./data
sudo chown -R $USER:$USER ./uploads
```

## 🚢 Production Deployment

For production, consider:

1. **Use environment-specific configuration**:
   - Create `application-prod.properties`
   - Use Docker secrets or environment variables for sensitive data

2. **Use a production database**:
   - PostgreSQL with proper backups
   - Consider managed database services (AWS RDS, Azure Database, etc.)

3. **Security**:
   - Change default passwords
   - Use strong JWT secrets
   - Enable HTTPS
   - Configure proper CORS settings

4. **Monitoring**:
   - Add health check endpoints
   - Set up logging aggregation
   - Monitor container resources

5. **Scaling**:
   - Use Docker Swarm or Kubernetes for orchestration
   - Set up load balancing
   - Configure database connection pooling

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Spring Boot Docker Guide](https://spring.io/guides/gs/spring-boot-docker/)

