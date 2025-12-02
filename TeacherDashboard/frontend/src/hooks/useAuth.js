import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook to handle authentication
 * - Checks if a teacher is logged in
 * - Redirects to login if not authenticated
 * - Returns the teacher's UID
 */
export function useAuth() {
    const navigate = useNavigate();

    const getTeacherUid = () => {
        try {
            const teacher = JSON.parse(localStorage.getItem('teacher'));
            return teacher?.uid || teacher?.teacher_uid || null;
        } catch {
            return null;
        }
    };

    const teacherUid = getTeacherUid();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!teacherUid) {
            navigate('/login');
        }
    }, [teacherUid, navigate]);

    const getTeacher = () => {
        try {
            return JSON.parse(localStorage.getItem('teacher'));
        } catch {
            return null;
        }
    };

    const logout = () => {
        localStorage.removeItem('teacher');
        navigate('/');
    };

    return {
        teacherUid,
        teacher: getTeacher(),
        logout
    };
}
