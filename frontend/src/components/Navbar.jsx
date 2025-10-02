import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Bell, LogOut, Search, Settings, User } from "lucide-react";
import { useFriendStore } from "../store/useFriendStore";
import { useEffect, useMemo, useRef, useState } from "react";
import FriendRequestsModal from "./friends/FriendRequestsModal";

const Navbar = () => {
    const { logout, authUser } = useAuthStore();
    const {
        pendingRequests,
        fetchPendingRequests,
        searchUsers,
        searchResults,
        isSearching,
        searchError,
        clearSearchResults,
        sendFriendRequest,
        friends,
    } = useFriendStore();
    const [isRequestsOpen, setIsRequestsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [recentlySent, setRecentlySent] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        if (authUser) {
            fetchPendingRequests();
        }
    }, [authUser, fetchPendingRequests]);

    useEffect(() => {
        if (searchResults.length || searchError) {
            setIsDropdownOpen(true);
        }
    }, [searchResults, searchError]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
                clearSearchResults();
                setRecentlySent([]);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [clearSearchResults]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            clearSearchResults();
            setIsDropdownOpen(false);
            setRecentlySent([]);
        }
    }, [searchQuery, clearSearchResults]);

    const usersWithStatus = useMemo(() => {
        return searchResults.map((user) => {
            const isFriend = friends.some((friend) => friend._id === user._id);
            const hasIncomingRequest = pendingRequests.some(
                (request) => request.sender._id === user._id
            );
            const alreadySent = recentlySent.includes(user._id);

            return {
                ...user,
                status: isFriend
                    ? "friend"
                    : hasIncomingRequest
                        ? "incoming"
                        : alreadySent
                            ? "sent"
                            : "available",
            };
        });
    }, [friends, pendingRequests, recentlySent, searchResults]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            clearSearchResults();
            setIsDropdownOpen(false);
            return;
        }
        searchUsers(searchQuery.trim());
    };

    const handleSendRequest = async (userId) => {
        const success = await sendFriendRequest(userId);
        if (success) {
            setRecentlySent((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
        }
    };

    return (
        <>
            <header
                className="bg-base-100/80 border-b border-base-300 fixed w-full top-0 z-40
    backdrop-blur-lg bg-base-100/80"
            >
                <div className="container mx-auto px-4 h-16">
                <div className="flex items-center justify-between h-full">
                    <div className="flex items-center gap-4 lg:gap-8">
                        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
                            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                <img src="/vite.svg" alt="Vite Logo"/>
                            </div>
                            <h1 className="text-lg font-bold">Vibbly</h1>
                        </Link>

                        {authUser && (
                            <div className="relative w-full sm:w-auto" ref={searchRef}>
                                <form onSubmit={handleSearchSubmit} className="w-full sm:w-64 lg:w-80">
                                    <label className="input input-sm input-bordered flex items-center gap-2 w-full">
                                        <Search className="size-4 text-base-content/60" />
                                        <input
                                            type="search"
                                            className="grow"
                                            placeholder="Search and add friends"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => {
                                                if (searchResults.length || searchError) {
                                                    setIsDropdownOpen(true);
                                                }
                                            }}
                                        />
                                        {isSearching && <span className="loading loading-spinner loading-xs" />}
                                    </label>
                                </form>

                                {isDropdownOpen && (
                                    <div className="absolute mt-2 w-full max-h-72 overflow-y-auto rounded-lg border border-base-300 bg-base-100 shadow-lg z-50">
                                        {searchError && (
                                            <p className="p-3 text-sm text-error">{searchError}</p>
                                        )}

                                        {!searchError && usersWithStatus.length === 0 && !isSearching && (
                                            <p className="p-3 text-sm text-base-content/60">
                                                Start typing to find friends.
                                            </p>
                                        )}

                                        {usersWithStatus.map((user) => (
                                            <div
                                                key={user._id}
                                                className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-base-200"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={user.profilePic || "/avatar.png"}
                                                        alt={user.fullName}
                                                        className="size-9 rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium leading-none">{user.fullName}</p>
                                                        <p className="text-xs text-base-content/60">{user.email}</p>
                                                    </div>
                                                </div>

                                                {user.status === "friend" && (
                                                    <span className="badge badge-success badge-sm">Friends</span>
                                                )}

                                                {user.status === "incoming" && (
                                                    <span className="badge badge-warning badge-sm">Respond pending</span>
                                                )}

                                                {user.status === "sent" && (
                                                    <span className="badge badge-info badge-sm">Request sent</span>
                                                )}

                                                {user.status === "available" && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs"
                                                        onClick={() => handleSendRequest(user._id)}
                                                        disabled={isSearching}
                                                    >
                                                        Add
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {authUser && (
                            <button
                                type="button"
                                className="relative btn btn-sm btn-ghost"
                                onClick={() => setIsRequestsOpen(true)}
                            >
                                <Bell className="size-5" />
                                {pendingRequests.length > 0 && (
                                    <span className="badge badge-primary badge-xs absolute -top-1 -right-1">
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </button>
                        )}
                        <Link
                            to={"/settings"}
                            className={`
              btn btn-sm gap-2 transition-colors
              
              `}
                        >
                            <Settings className="w-4 h-4" />
                            <span className="hidden sm:inline">Settings</span>
                        </Link>

                        {authUser && (
                            <>
                                <Link to={"/profile"} className={`btn btn-sm gap-2`}>
                                    <User className="size-5" />
                                    <span className="hidden sm:inline">Profile</span>
                                </Link>

                                <button className="flex gap-2 items-center" onClick={logout}>
                                    <LogOut className="size-5" />
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            </header>

            <FriendRequestsModal
                isOpen={isRequestsOpen}
                onClose={() => setIsRequestsOpen(false)}
            />
        </>
    );
};
export default Navbar;
