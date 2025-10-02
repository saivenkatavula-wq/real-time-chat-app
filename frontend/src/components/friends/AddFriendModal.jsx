import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Search, UserPlus } from "lucide-react";
import { useFriendStore } from "../../store/useFriendStore";
import { useAuthStore } from "../../store/useAuthStore";

const AddFriendModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [sentRequests, setSentRequests] = useState([]);

  const {
    searchUsers,
    searchResults,
    isSearching,
    searchError,
    clearSearchResults,
    sendFriendRequest,
    friends,
    pendingRequests,
  } = useFriendStore();

  const { authUser } = useAuthStore();

  // keep this effect — it will still run when isOpen flips to false
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSentRequests([]);
      clearSearchResults();
    }
  }, [isOpen, clearSearchResults]);

  const handleSubmit = (e) => {
    e.preventDefault();
    searchUsers(query);
  };

  const handleSendRequest = async (userId) => {
    const success = await sendFriendRequest(userId);
    if (success) {
      setSentRequests((prev) => [...prev, userId]);
    }
  };

  const usersWithStatus = useMemo(() => {
    return searchResults.map((user) => {
      const isFriend = friends.some((friend) => friend._id === user._id);
      const hasIncomingRequest = pendingRequests.some(
        (request) => request.sender._id === user._id
      );
      const alreadySent = sentRequests.includes(user._id);

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
  }, [friends, pendingRequests, searchResults, sentRequests]);

  // Only conditionally render UI; hooks above always run in the same order
  return isOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-200/70">
      <div className="bg-base-100 rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
          <h3 className="text-lg font-semibold">Add a friend</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/50" />
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Search by name or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSearching}>
              {isSearching ? <Loader2 className="size-4 animate-spin" /> : "Search"}
            </button>
          </form>

          {searchError && <p className="text-sm text-error">{searchError}</p>}

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {usersWithStatus.length === 0 && !searchError && !isSearching && (
              <p className="text-sm text-base-content/60">
                Use the search above to find friends.
              </p>
            )}

            {usersWithStatus.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between border border-base-300 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="size-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium leading-none">{user.fullName}</p>
                    <p className="text-sm text-base-content/60">{user.email}</p>
                  </div>
                </div>

                {user.status === "friend" && (
                  <span className="text-xs text-success">Friends</span>
                )}

                {user.status === "incoming" && (
                  <span className="text-xs text-warning">Pending your response</span>
                )}

                {user.status === "sent" && (
                  <span className="text-xs text-info">Request sent</span>
                )}

                {user.status === "available" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => handleSendRequest(user._id)}
                    disabled={authUser?._id === user._id}
                  >
                    <UserPlus className="size-4 mr-1" />
                    Send request
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : null;
};

export default AddFriendModal;
