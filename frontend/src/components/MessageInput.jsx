import { useRef, useState, useMemo } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Sparkles, Loader2, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef(null);
    const sendMessage = useChatStore((state) => state.sendMessage);
    const selectedUser = useChatStore((state) => state.selectedUser);
    const aiStateByUser = useChatStore((state) => state.aiStateByUser);
    const setAiModeForUser = useChatStore((state) => state.setAiModeForUser);
    const setAiToneForUser = useChatStore((state) => state.setAiToneForUser);
    const fetchAiSuggestion = useChatStore((state) => state.fetchAiSuggestion);
    const isAiLoading = useChatStore((state) => state.isAiLoading);
    const clearAiSuggestion = useChatStore((state) => state.clearAiSuggestion);

    const selectedUserId = selectedUser?._id;
    const aiState = useMemo(() => {
        if (!selectedUserId) return undefined;
        return aiStateByUser[selectedUserId];
    }, [selectedUserId, aiStateByUser]);
    const aiEnabled = aiState?.enabled ?? false;
    const selectedTone = aiState?.tone ?? "";
    const aiSuggestion = aiState?.suggestion ?? "";

    const toneOptions = [
        { label: "Friendly", value: "friendly" },
        { label: "Professional", value: "professional" },
        { label: "Casual", value: "casual" },
        { label: "Empathetic", value: "empathetic" },
        { label: "Encouraging", value: "encouraging" },
    ];

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!text.trim() && !imagePreview) return;

        if (isSending) return;

        setIsSending(true);

        try {
            await sendMessage({
                text: text.trim(),
                image: imagePreview,
            });

            // Clear form
            setText("");
            setImagePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleToggleAi = async (e) => {
        if (!selectedUserId) return;
        const enabled = e.target.checked;
        setAiModeForUser(selectedUserId, enabled);
        if (!enabled) {
            clearAiSuggestion(selectedUserId);
        } else {
            toast.success("Select a tone to get an AI suggestion");
        }
    };

    const handleToneChange = async (e) => {
        if (!selectedUserId) return;
        const tone = e.target.value;
        if (!tone) {
            setAiToneForUser(selectedUserId, null);
            clearAiSuggestion(selectedUserId);
            return;
        }

        setAiToneForUser(selectedUserId, tone);
        await fetchAiSuggestion(selectedUserId);
    };

    const handleUseSuggestion = () => {
        if (!selectedUserId || !aiSuggestion) return;
        setText(aiSuggestion);
        clearAiSuggestion(selectedUserId);
    };

    const handleRefreshSuggestion = async () => {
        if (!selectedUserId) return;
        await fetchAiSuggestion(selectedUserId);
    };

    return (
        <div className="p-4 w-full">
            {selectedUser && (
                <div className="mb-3 rounded-lg border border-zinc-700/60 bg-base-200 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                                type="checkbox"
                                className="toggle toggle-sm"
                                checked={aiEnabled}
                                onChange={handleToggleAi}
                            />
                            <span className="flex items-center gap-1">
                                <Sparkles size={16} />
                                AI Mode
                            </span>
                        </label>

                        {aiEnabled && (
                            <select
                                className="select select-bordered select-sm w-full sm:w-48"
                                value={selectedTone}
                                onChange={handleToneChange}
                            >
                                <option value="">Select tone</option>
                                {toneOptions.map((tone) => (
                                    <option key={tone.value} value={tone.value}>
                                        {tone.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {aiEnabled && selectedTone && (
                        <div className="mt-3 flex flex-col gap-2 rounded-md bg-base-300/40 p-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                                <Sparkles size={16} />
                                Suggestion
                                {isAiLoading && <Loader2 className="size-4 animate-spin" />}
                            </div>
                            {aiSuggestion ? (
                                <p className="text-sm text-zinc-200">{aiSuggestion}</p>
                            ) : (
                                !isAiLoading && (
                                    <p className="text-sm text-zinc-400">
                                        No suggestion yet. Click refresh to generate one.
                                    </p>
                                )
                            )}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-xs"
                                    onClick={handleRefreshSuggestion}
                                    disabled={isAiLoading}
                                >
                                    {isAiLoading ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            Generating
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCcw size={14} />
                                            Refresh
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-xs btn-primary"
                                    onClick={handleUseSuggestion}
                                    disabled={!aiSuggestion}
                                >
                                    Use Suggestion
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {imagePreview && (
                <div className="mb-3 flex items-center gap-2">
                    <div className="relative">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                        />
                        <button
                            onClick={removeImage}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
                            type="button"
                        >
                            <X className="size-3" />
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        className="w-full input input-bordered rounded-lg input-sm sm:input-md"
                        placeholder="Type a message..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                    />

                    <button
                        type="button"
                        className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Image size={20} />
                    </button>
                </div>
                <button
                    type="submit"
                    className="btn btn-sm btn-circle"
                    disabled={isSending || (!text.trim() && !imagePreview)}
                >
                    {isSending ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Send size={22} />
                    )}
                </button>
            </form>
        </div>
    );
};
export default MessageInput;
