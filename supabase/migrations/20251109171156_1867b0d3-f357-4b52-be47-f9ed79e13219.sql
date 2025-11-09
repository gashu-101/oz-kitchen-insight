-- Fix the phone_number unique constraint issue
-- The trigger was inserting empty strings which violate unique constraints
-- We need to use NULL for optional fields

-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_profile_for_new_user() CASCADE;

-- Recreate the function with proper NULL handling
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, phone_number, created_at, updated_at)
    VALUES (
        NEW.id,
        NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), ''),
        NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), ''),
        NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone_number', '')), ''),
        NOW(),
        NOW()
    );
    
    -- Create welcome notification
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (
        NEW.id,
        'Welcome to OZ Kitchen! 🍱',
        'Thank you for joining OZ Kitchen. Your fresh, delicious meals are just a few clicks away!',
        'system',
        jsonb_build_object(
            'action', 'welcome',
            'show_tutorial', true,
            'created_at', NOW()
        )
    );
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_new_user();

-- Clean up any existing empty string phone numbers
UPDATE public.profiles 
SET phone_number = NULL 
WHERE phone_number = '' OR TRIM(phone_number) = '';

-- Add a helper function for super admins to promote users to admin
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(
    target_user_id UUID,
    admin_role TEXT DEFAULT 'admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only super admins can promote users
    IF NOT is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only super admins can promote users to admin';
    END IF;
    
    -- Check if user exists in profiles
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Insert or update admin_users record
    INSERT INTO admin_users (id, role, is_active)
    VALUES (target_user_id, admin_role, true)
    ON CONFLICT (id) DO UPDATE
    SET role = admin_role, is_active = true;
    
    RETURN TRUE;
END;
$$;