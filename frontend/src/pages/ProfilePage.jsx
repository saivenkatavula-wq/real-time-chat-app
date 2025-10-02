import {useEffect, useState} from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, IdCard, Save } from "lucide-react";

const ProfilePage = () => {
    const { authUser, isUpdatingProfile, updateProfile, isUpdatingName, updateName } = useAuthStore();
    const [selectedImg, setSelectedImg] = useState(null);
    const [fullName, setFullName] = useState(authUser?.fullName || "");

    useEffect(() => {
        setFullName(authUser?.fullName || "");
    }, [authUser?.fullName]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.readAsDataURL(file);

        reader.onload = async () => {
            const base64Image = reader.result;
            setSelectedImg(base64Image);
            await updateProfile({ profilePic: base64Image });
        };
    };

    const handleSubmitName = async (e) => {
        e.preventDefault();
        const trimmed = (fullName || "").trim();
        if (!trimmed) return;
        // optional: small guard to avoid no-op
        if (trimmed === authUser?.fullName) return;
        await updateName({ fullName: trimmed });
    };

    return (
        <div className="h-screen pt-20">
            <div className="max-w-2xl mx-auto p-4 py-8">
                <div className="bg-base-300 rounded-xl p-6 space-y-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold ">Profile</h1>
                        <p className="mt-2">Your profile information</p>
                    </div>

                    {/* avatar upload section */}

                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <img
                                src={selectedImg || authUser.profilePic || "/avatar.png"}
                                alt="Profile"
                                className="size-32 rounded-full object-cover border-4 "
                            />
                            <label
                                htmlFor="avatar-upload"
                                className={`
                  absolute bottom-0 right-0 
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
                            >
                                <Camera className="w-5 h-5 text-base-200" />
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={isUpdatingProfile}
                                />
                            </label>
                        </div>
                        <p className="text-sm text-zinc-400">
                            {isUpdatingProfile ? "Uploading..." : "Click the camera icon to update your photo"}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <form onSubmit={handleSubmitName} className="space-y-2">
                            <div className="text-sm text-zinc-400 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Full Name
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className="w-full px-4 py-2.5 bg-base-200 rounded-lg border"
                                    disabled={isUpdatingName}
                                />
                                <button
                                    type="submit"
                                    disabled={isUpdatingName || !fullName?.trim() || fullName.trim() === authUser?.fullName}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-content disabled:opacity-60"
                                    title="Save name"
                                >
                                    <Save className="w-4 h-4" />
                                    {isUpdatingName ? "Saving..." : "Save"}
                                </button>
                            </div>
                            <p className="text-xs text-zinc-500">Press Enter to save.</p>
                        </form>
                        <div className="space-y-1.5">
                            <div className="text-sm text-zinc-400 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email Address
                            </div>

                            <input
                                type="email"
                                value={authUser?.email ?? ""}
                                disabled
                                aria-disabled="true"
                                className="w-full px-4 py-2.5 bg-base-200 rounded-lg border opacity-70 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="text-sm text-zinc-400 flex items-center gap-2">
                                <IdCard className="w-4 h-4" />
                                Users Unique ID
                            </div>
                            <input
                                type="email"
                                value={authUser?._id ?? ""}
                                disabled
                                aria-disabled="true"
                                className="w-full px-4 py-2.5 bg-base-200 rounded-lg border opacity-70 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="mt-6 bg-base-300 rounded-xl p-6">
                        <h2 className="text-lg font-medium  mb-4">Account Information</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                                <span>Member Since</span>
                                <span>{authUser.createdAt?.split("T")[0]}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span>Account Status</span>
                                <span className="text-green-500">Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default ProfilePage;