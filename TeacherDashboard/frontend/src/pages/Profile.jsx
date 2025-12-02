import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTeacherProfile, updateTeacherProfile } from "../api/profileApi";

export default function Profile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState({
        name: "",
        email: "",
        bio: "",
        favorite_opening_move: ""
    });
    const [originalProfile, setOriginalProfile] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [hasChanges, setHasChanges] = useState(false);

    // Get teacher_uid from localStorage
    const getTeacherUid = () => {
        try {
            const teacher = JSON.parse(localStorage.getItem("teacher"));
            return teacher?.uid || teacher?.teacher_uid || null;
        } catch {
            return null;
        }
    };

    const teacherUid = getTeacherUid();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!teacherUid) {
            navigate("/login");
        }
    }, [teacherUid, navigate]);

    useEffect(() => {
        if (teacherUid) {
            fetchProfile();
        }
    }, [teacherUid]);

    useEffect(() => {
        // Check if profile has changes compared to original
        const changed =
            profile.name !== originalProfile.name ||
            profile.bio !== originalProfile.bio ||
            profile.favorite_opening_move !== originalProfile.favorite_opening_move;
        setHasChanges(changed);
    }, [profile, originalProfile]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await getTeacherProfile(teacherUid);
            setProfile(data);
            setOriginalProfile(data);
            setMessage({ type: "", text: "" });
        } catch (error) {
            setMessage({
                type: "error",
                text: "Failed to load profile. Please try again."
            });
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!hasChanges) {
            setMessage({ type: "info", text: "No changes to save." });
            return;
        }

        try {
            setSaving(true);
            setMessage({ type: "", text: "" });

            const updatedProfile = await updateTeacherProfile(teacherUid, {
                name: profile.name,
                bio: profile.bio,
                favorite_opening_move: profile.favorite_opening_move
            });

            setProfile(updatedProfile);
            setOriginalProfile(updatedProfile);
            setMessage({
                type: "success",
                text: "Profile updated successfully!"
            });
        } catch (error) {
            setMessage({
                type: "error",
                text: "Failed to update profile. Please try again."
            });
            console.error("Error updating profile:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setProfile(originalProfile);
        setMessage({ type: "", text: "" });
    };

    if (loading) {
        return (
            <div className="main-content">
                <div className="profile-loading">Loading profile...</div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <h1 className="page-title">My Profile</h1>

            <div className="profile-container">
                <form className="profile-form" onSubmit={handleSave}>
                    {message.text && (
                        <div className={`profile-message profile-message-${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="profile-field">
                        <label htmlFor="name" className="profile-label">Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={profile.name}
                            onChange={handleChange}
                            className="profile-input"
                            required
                        />
                    </div>

                    <div className="profile-field">
                        <label htmlFor="email" className="profile-label">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={profile.email}
                            className="profile-input"
                            disabled
                            title="Email cannot be changed"
                        />
                        <p className="profile-field-hint">Email address cannot be changed</p>
                    </div>

                    <div className="profile-field">
                        <label htmlFor="bio" className="profile-label">Bio</label>
                        <textarea
                            id="bio"
                            name="bio"
                            value={profile.bio || ""}
                            onChange={handleChange}
                            className="profile-textarea"
                            rows="4"
                            placeholder="Tell us a bit about yourself..."
                        />
                    </div>

                    <div className="profile-field">
                        <label htmlFor="favorite_opening_move" className="profile-label">
                            Favorite Opening Move
                        </label>
                        <input
                            type="text"
                            id="favorite_opening_move"
                            name="favorite_opening_move"
                            value={profile.favorite_opening_move || ""}
                            onChange={handleChange}
                            className="profile-input"
                            placeholder="e.g., e4, d4, Nf3"
                        />
                    </div>

                    <div className="profile-actions">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="profile-button profile-button-cancel"
                            disabled={!hasChanges || saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="profile-button profile-button-save"
                            disabled={!hasChanges || saving}
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
