const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

/**
 * Fetch teacher profile by teacher_uid
 * @param {string} teacherUid - The teacher's unique identifier
 * @returns {Promise<Object>} Teacher profile data
 */
export async function getTeacherProfile(teacherUid) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/get_teacher_profile?teacher_uid=${teacherUid}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch profile');
        }

        const data = await response.json();
        return data.profile;
    } catch (error) {
        console.error('Error in getTeacherProfile:', error);
        throw error;
    }
}

/**
 * Update teacher profile
 * @param {string} teacherUid - The teacher's unique identifier
 * @param {Object} profileData - Profile fields to update (name, bio, favorite_opening_move)
 * @returns {Promise<Object>} Updated teacher profile data
 */
export async function updateTeacherProfile(teacherUid, profileData) {
    try {
        const response = await fetch(`${API_BASE_URL}/update_teacher_profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                teacher_uid: teacherUid,
                ...profileData
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update profile');
        }

        const data = await response.json();
        return data.profile;
    } catch (error) {
        console.error('Error in updateTeacherProfile:', error);
        throw error;
    }
}
