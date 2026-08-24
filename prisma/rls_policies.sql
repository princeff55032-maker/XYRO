-- ==============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Role-Based Access Control for XYRO Gym Management System
-- ==============================================================================

-- 1. Helper Functions to Resolve Session Identity & Tenancy
-- ------------------------------------------------------------------------------

-- Returns current user's DB ID from Supabase Auth UID
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::TEXT;
$$ LANGUAGE SQL STABLE;

-- Returns user role from database for the active auth UID
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM users WHERE id = current_user_id() AND status = 'ACTIVE' LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Returns true if the active user is a SUPER_ADMIN
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT (current_user_role() = 'SUPER_ADMIN');
$$ LANGUAGE SQL STABLE;

-- Returns set of gym IDs the current user belongs to (as owner, staff, trainer, or member)
CREATE OR REPLACE FUNCTION current_user_gym_ids()
RETURNS SETOF TEXT AS $$
  -- Owned gyms
  SELECT id FROM gyms WHERE "ownerId" = current_user_id()
  UNION
  -- Staff gyms
  SELECT "gymId" FROM gym_staff WHERE "userId" = current_user_id()
  UNION
  -- Trainer gyms
  SELECT "gymId" FROM trainers WHERE "userId" = current_user_id()
  UNION
  -- Member gyms
  SELECT "gymId" FROM members WHERE "userId" = current_user_id();
$$ LANGUAGE SQL STABLE;


-- ==============================================================================
-- 2. Enable RLS on All Tables
-- ==============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 3. Users Table Policies
-- ==============================================================================

-- Users can read their own profile; Super Admins & Gym Owners can view members in their gyms
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    id = current_user_id()
    OR is_super_admin()
    OR id IN (
      SELECT m."userId" FROM members m WHERE m."gymId" IN (SELECT current_user_gym_ids())
      UNION
      SELECT t."userId" FROM trainers t WHERE t."gymId" IN (SELECT current_user_gym_ids())
    )
  );

-- Users can only update their own profile; Super Admin can manage all
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    id = current_user_id() OR is_super_admin()
  ) WITH CHECK (
    id = current_user_id() OR is_super_admin()
  );


-- ==============================================================================
-- 4. Gyms Table Policies
-- ==============================================================================

-- Public can view active gyms; users can view gyms they belong to; Super Admin can view all
CREATE POLICY "gyms_select_policy" ON gyms
  FOR SELECT USING (
    status = 'ACTIVE'
    OR "ownerId" = current_user_id()
    OR id IN (SELECT current_user_gym_ids())
    OR is_super_admin()
  );

-- Only Gym Owner or Super Admin can update gym details
CREATE POLICY "gyms_update_policy" ON gyms
  FOR UPDATE USING (
    "ownerId" = current_user_id() OR is_super_admin()
  ) WITH CHECK (
    "ownerId" = current_user_id() OR is_super_admin()
  );


-- ==============================================================================
-- 5. Gym Settings & Subscriptions
-- ==============================================================================

CREATE POLICY "gym_settings_select_policy" ON gym_settings
  FOR SELECT USING (
    "gymId" IN (SELECT current_user_gym_ids()) OR is_super_admin()
  );

CREATE POLICY "gym_settings_modify_policy" ON gym_settings
  FOR ALL USING (
    is_super_admin() OR (
      current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN')
      AND "gymId" IN (SELECT current_user_gym_ids())
    )
  );

CREATE POLICY "gym_subscriptions_select_policy" ON gym_subscriptions
  FOR SELECT USING (
    "gymId" IN (SELECT current_user_gym_ids()) OR is_super_admin()
  );

CREATE POLICY "gym_subscriptions_manage_policy" ON gym_subscriptions
  FOR ALL USING (is_super_admin());


-- ==============================================================================
-- 6. Membership Plans Policies
-- ==============================================================================

-- Everyone in the gym (and public on registration) can view active plans
CREATE POLICY "plans_select_policy" ON membership_plans
  FOR SELECT USING (
    "deletedAt" IS NULL AND (
      "gymId" IN (SELECT current_user_gym_ids())
      OR is_super_admin()
    )
  );

-- Only Gym Owners & Admins can create/update/deactivate plans
CREATE POLICY "plans_modify_policy" ON membership_plans
  FOR ALL USING (
    is_super_admin() OR (
      current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN')
      AND "gymId" IN (SELECT current_user_gym_ids())
    )
  );


-- ==============================================================================
-- 7. Members & Memberships Policies
-- ==============================================================================

CREATE POLICY "members_select_policy" ON members
  FOR SELECT USING (
    "userId" = current_user_id()
    OR is_super_admin()
    OR (
      current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN', 'TRAINER', 'RECEPTIONIST')
      AND "gymId" IN (SELECT current_user_gym_ids())
    )
  );

CREATE POLICY "members_modify_policy" ON members
  FOR ALL USING (
    is_super_admin() OR (
      current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN', 'RECEPTIONIST')
      AND "gymId" IN (SELECT current_user_gym_ids())
    )
  );

CREATE POLICY "memberships_select_policy" ON memberships
  FOR SELECT USING (
    "memberId" IN (SELECT id FROM members WHERE "userId" = current_user_id())
    OR is_super_admin()
    OR "gymId" IN (SELECT current_user_gym_ids())
  );

CREATE POLICY "memberships_modify_policy" ON memberships
  FOR ALL USING (
    is_super_admin() OR (
      current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN', 'RECEPTIONIST')
      AND "gymId" IN (SELECT current_user_gym_ids())
    )
  );


-- ==============================================================================
-- 8. Payments & Attendance Policies
-- ==============================================================================

CREATE POLICY "payments_select_policy" ON payments
  FOR SELECT USING (
    "memberId" IN (SELECT id FROM members WHERE "userId" = current_user_id())
    OR is_super_admin()
    OR (
      current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN', 'RECEPTIONIST')
      AND "gymId" IN (SELECT current_user_gym_ids())
    )
  );

CREATE POLICY "payments_insert_policy" ON payments
  FOR INSERT WITH CHECK (
    is_super_admin() OR (
      current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN', 'RECEPTIONIST')
      AND "gymId" IN (SELECT current_user_gym_ids())
    )
  );

CREATE POLICY "attendance_select_policy" ON attendance
  FOR SELECT USING (
    "memberId" IN (SELECT id FROM members WHERE "userId" = current_user_id())
    OR is_super_admin()
    OR "gymId" IN (SELECT current_user_gym_ids())
  );

CREATE POLICY "attendance_insert_policy" ON attendance
  FOR INSERT WITH CHECK (
    is_super_admin() OR (
      current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN', 'TRAINER', 'RECEPTIONIST')
      AND "gymId" IN (SELECT current_user_gym_ids())
    )
  );


-- ==============================================================================
-- 9. Trainers, Workout Plans & Diet Plans Policies
-- ==============================================================================

CREATE POLICY "trainers_select_policy" ON trainers
  FOR SELECT USING (
    "gymId" IN (SELECT current_user_gym_ids()) OR is_super_admin()
  );

CREATE POLICY "trainers_modify_policy" ON trainers
  FOR ALL USING (
    is_super_admin() OR (
      current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN')
      AND "gymId" IN (SELECT current_user_gym_ids())
    )
  );

CREATE POLICY "workouts_select_policy" ON workout_plans
  FOR SELECT USING (
    "memberId" IN (SELECT id FROM members WHERE "userId" = current_user_id())
    OR is_super_admin()
    OR "gymId" IN (SELECT current_user_gym_ids())
  );

CREATE POLICY "workouts_modify_policy" ON workout_plans
  FOR ALL USING (
    is_super_admin() OR (
      current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN', 'TRAINER')
      AND "gymId" IN (SELECT current_user_gym_ids())
    )
  );

CREATE POLICY "diets_select_policy" ON diet_plans
  FOR SELECT USING (
    "memberId" IN (SELECT id FROM members WHERE "userId" = current_user_id())
    OR is_super_admin()
    OR "gymId" IN (SELECT current_user_gym_ids())
  );

CREATE POLICY "diets_modify_policy" ON diet_plans
  FOR ALL USING (
    is_super_admin() OR (
      current_user_role() IN ('GYM_OWNER', 'GYM_ADMIN', 'TRAINER')
      AND "gymId" IN (SELECT current_user_gym_ids())
    )
  );
