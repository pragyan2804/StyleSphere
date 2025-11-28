import supabase from './supabaseClient';

/**
 * Checks if a user-specific JSON file exists in the 'userdata' bucket.
 * If not, it creates one with initial user data.
 * @param {object} user - The Supabase Auth user object.
 * @returns {Promise<object>} An object indicating success, creation status, and message.
 */
const ensureUserDataFile = async (user) => {
  if (!user || !user.id) {
    console.error("ensureUserDataFile: No user or user ID provided.");
    return { ok: false, message: "No user or user ID provided." };
  }

  const filePath = `${user.id}.json`;
  const bucketName = 'userdata';

  try {
    // 1. Check if file exists by trying to get its metadata (or download)
    // We'll try a download, as it's a direct check.
    const { data: existingFileData, error: downloadError } = await supabase
      .storage
      .from(bucketName)
      .download(filePath);

    // 2. File already exists
    if (existingFileData) {
      return { ok: true, created: false, message: 'User data file already exists.' };
    }

    // 3. File doesn't exist (check for specific "Not Found" error)
    if (downloadError && (downloadError.statusCode === 404 || downloadError.message.includes('Not Found'))) {
      
      // 4. Prepare initial content from the user object
      const initialUserData = {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.fullName || '', // Get from metadata
        createdAt: user.created_at || new Date().toISOString(),
        // Add any other default fields you want
        // e.g., preferences: {}, projects: []
      };

      // Create a Blob from the JSON string
      const contentBlob = new Blob([JSON.stringify(initialUserData, null, 2)], {
        type: 'application/json'
      });

      // 5. Create the file
      const { error: uploadError } = await supabase
        .storage
        .from(bucketName)
        .upload(filePath, contentBlob, {
          contentType: 'application/json',
          upsert: false // We already know it doesn't exist
        });

      if (uploadError) {
        console.error('Error uploading new userdata file:', uploadError);
        return { ok: false, error: uploadError, message: 'Failed to create user data file.' };
      }

      // 6. Success
      return { ok: true, created: true, message: 'User data file created successfully.' };
    }

    // 7. Handle other download errors (e.g., RLS, network)
    if (downloadError) {
      console.error('Error checking for userdata file:', downloadError);
      return { ok: false, error: downloadError, message: 'Error checking for existing file.' };
    }

    // Should not be reachable
    return { ok: false, message: 'Unknown state while checking file.' };

  } catch (err) {
    console.error('Unexpected error in ensureUserDataFile:', err);
    return { ok: false, error: err, message: 'An unexpected error occurred.' };
  }
};

export default ensureUserDataFile;