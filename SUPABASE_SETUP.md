# Supabase Database Setup for Bulkine

This guide will help you set up the Supabase database schema and configure your environment.

## 1. Database Schema Setup

### Run the Schema Script

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Execute the script

This will create:
- **User profile table** with onboarding data, diet preferences, and streak tracking
- **Food logs table** for daily food entries
- **Weight history table** for weight tracking over time
- **Row Level Security (RLS)** policies for data protection
- **Automatic triggers** for timestamps and user profile creation

## 2. Environment Variables

Ensure your `.env.local` file contains:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. Data Migration

The app includes automatic data migration from localStorage to Supabase:

- **One-time migration**: Runs automatically when a user first loads the dashboard after the update
- **Seamless transition**: Existing users won't lose any data
- **Cleanup**: localStorage data is preserved until migration is confirmed successful

### Migration Process:
1. User loads dashboard → migration check runs
2. If localStorage data exists → automatically migrates to Supabase
3. Migration flag set → prevents duplicate migrations
4. New users → skip migration, use Supabase directly

## 4. New User Flow

For new users after migration:

1. **Onboarding** → Temporarily saves data to localStorage
2. **Setup** → Combines onboarding + setup data and saves to Supabase
3. **Dashboard** → Loads data from Supabase
4. **All interactions** → Sync with Supabase in real-time

## 5. Data Synchronization

The app now supports:

- ✅ **Cross-device sync**: Data accessible from any device
- ✅ **Real-time updates**: Changes sync immediately
- ✅ **Offline resilience**: Optimistic updates with error handling
- ✅ **Data backup**: All data persisted in Supabase cloud

## 6. Features Enabled

🔄 **Data syncing across devices**
- Food logs, weight history, streaks all sync
- Login on new device → see all your progress

📱 **Persistent user progress**
- No more lost data when clearing browser storage
- Reliable streak tracking

🔐 **Secure data storage**
- Row Level Security ensures users only see their own data
- Data encrypted at rest and in transit

## 7. Troubleshooting

### Migration Issues
- Check browser console for migration logs
- If migration fails, user can still use the app (just won't see old data)
- Contact support if critical data is missing

### Authentication Issues
- Ensure environment variables are set correctly
- Check Supabase project settings and RLS policies
- Verify user is authenticated before dashboard access

### Performance
- First load might be slower due to migration
- Subsequent loads will be fast as data is cached
- Food log queries are optimized with proper indexes

## 8. Database Monitoring

Important tables to monitor:
- `user_profiles`: User account data and settings
- `food_logs`: Daily food entries (high volume)
- `weight_history`: Weight tracking data

## 9. Backup Considerations

Supabase handles:
- Automatic backups
- Point-in-time recovery
- High availability

No additional backup setup needed for production use.