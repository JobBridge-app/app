# Database Performance Optimization Guide

This document outlines recommended database indexes and query optimizations for the JobBridge application.

## Recommended Database Indexes

### High Priority Indexes

These indexes are critical for performance and should be added to improve query performance:

#### 1. `profiles` Table
```sql
-- For admin dashboard and recent activity queries
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc 
ON profiles (created_at DESC);

-- For account type filtering in work queues
CREATE INDEX IF NOT EXISTS idx_profiles_account_type_created_at 
ON profiles (account_type, created_at DESC);
```
**Usage**: Admin dashboard metrics, recent activity feed, work queue generation

#### 2. `jobs` Table
```sql
-- For job feed queries and sorting
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at 
ON jobs (status, created_at DESC);

-- For user's posted jobs
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by_created_at 
ON jobs (posted_by, created_at DESC);
```
**Usage**: Job listings, user-specific job queries, admin dashboard

#### 3. `applications` Table
```sql
-- For user's applications and status filtering
CREATE INDEX IF NOT EXISTS idx_applications_user_status 
ON applications (user_id, status, created_at DESC);

-- For job provider's application review
CREATE INDEX IF NOT EXISTS idx_applications_job_status 
ON applications (job_id, status, created_at DESC);

-- For work queue (submitted applications)
CREATE INDEX IF NOT EXISTS idx_applications_status_created_at 
ON applications (status, created_at DESC);
```
**Usage**: User activity page, job provider application management, admin work queue

#### 4. `user_system_roles` Table
```sql
-- For middleware role checks (now cached, but still useful for cache misses)
CREATE INDEX IF NOT EXISTS idx_user_system_roles_user_id 
ON user_system_roles (user_id);
```
**Usage**: Middleware authentication, batch role lookups in admin interface

#### 5. `guardian_relationships` Table
```sql
-- For checking active guardian status
CREATE INDEX IF NOT EXISTS idx_guardian_relationships_child_status 
ON guardian_relationships (child_id, status);
```
**Usage**: Job application validation, profile verification

### Medium Priority Indexes

#### 6. `reports` Table
```sql
-- For moderation work queue
CREATE INDEX IF NOT EXISTS idx_reports_status_created_at 
ON reports (status, created_at DESC);
```
**Usage**: Admin moderation dashboard

#### 7. `notifications` Table
```sql
-- For unread notification counts
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications (user_id, read_at, created_at DESC);
```
**Usage**: Notification popover, unread counts

### Foreign Key Indexes

Ensure all foreign key columns have indexes (these may already exist):
```sql
-- If not already indexed by foreign key constraint
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs (posted_by);
CREATE INDEX IF NOT EXISTS idx_jobs_market_id ON jobs (market_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications (user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications (job_id);
```

## Query Optimizations Implemented

### 1. Eliminated N+1 Queries
- **Location**: `src/lib/dal/jobbridge.ts` - `fetchJobs()`
- **Change**: Use Supabase foreign key joins instead of separate profile queries
- **Impact**: Reduces 2+ sequential queries to 1 query per jobs fetch

### 2. Parallelized Sequential Queries
- **Location**: `src/app/app-home/offers/actions.ts` - `createJob()`
- **Change**: Use `Promise.all()` to fetch profile and location data in parallel
- **Impact**: Reduces total query time by ~50% when both queries are needed

### 3. Middleware Role Caching
- **Location**: `middleware.ts`
- **Change**: Cache user roles in HTTP-only cookie with 5-minute TTL
- **Impact**: Eliminates database query on every protected route request (99%+ reduction)

### 4. Single-Pass Statistics
- **Location**: `src/components/activity/ActivityList.tsx`
- **Change**: Use `reduce()` instead of multiple `filter()` operations
- **Impact**: O(n) instead of O(3n) for calculating application stats

### 5. Merge Sort for Search Results
- **Location**: `src/lib/data/adminSearch.ts`
- **Change**: Merge pre-sorted results instead of re-sorting all items
- **Impact**: O(n) instead of O(n log n) for combining search results

### 6. React Component Memoization
- **Location**: `src/components/jobs/JobsList.tsx`
- **Change**: Use `useMemo` for filtered job lists
- **Impact**: Prevents unnecessary re-filtering on every render

## Performance Monitoring

### Key Metrics to Track
1. **Query Execution Time**: Monitor slow queries using Supabase dashboard
2. **Cache Hit Rate**: Track middleware role cache effectiveness
3. **Database Connection Pool**: Monitor for connection exhaustion
4. **Page Load Time**: Measure improvement in job feed and dashboard loads

### Expected Improvements

**Note**: These are estimated improvements based on performance analysis. Actual improvements should be validated with real-world metrics after deployment using monitoring tools.

- **Job Feed Load Time**: ~30-50% reduction (N+1 elimination + caching)
- **Protected Route Response**: ~80-95% reduction (role caching)
- **Admin Dashboard Load**: ~20-30% reduction (query optimizations)
- **Component Re-render Performance**: ~40-60% reduction (memoization)

## Future Optimizations

### Additional Opportunities
1. **Full-Text Search**: Consider PostgreSQL `tsvector` for better search performance
2. **Materialized Views**: For complex admin dashboard queries
3. **Query Result Caching**: Add application-level caching for frequently accessed data
4. **Connection Pooling**: Review and optimize Supabase connection pool settings
5. **Database Partitioning**: Consider partitioning large tables by date

### Monitoring and Maintenance
- Regularly analyze query performance with `EXPLAIN ANALYZE`
- Review slow query logs monthly
- Update statistics with `ANALYZE` after bulk operations
- Monitor index usage and remove unused indexes

## Implementation Notes

1. Create indexes during low-traffic periods
2. Test query performance before and after index creation
3. Monitor disk space usage after adding indexes
4. Consider using `CONCURRENTLY` option for production deployments:
   ```sql
   CREATE INDEX CONCURRENTLY idx_name ON table (column);
   ```

## Resources
- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [Next.js Performance Optimization](https://nextjs.org/docs/pages/building-your-application/optimizing)
