import { MessageSquare } from "lucide-react";

const NoChatSelected = () => {
    return (
        <div className="w-full flex flex-1 flex-col items-center justify-center p-16 bg-gradient-to-br from-base-100/70 to-base-200/50 backdrop-blur-sm">
            <div className="max-w-md text-center space-y-8 animate-fade-in">
                <div className="flex justify-center gap-4 mb-6">
                    <div className="relative">
                        <div
                            className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center
             justify-center shadow-lg shadow-primary/30 animate-pulse hover:scale-105 transition-transform"
                        >
                            <MessageSquare className="w-10 h-10 text-primary drop-shadow-lg" />
                        </div>
                        <div className="absolute inset-0 rounded-3xl blur-2xl bg-primary/20 opacity-50 animate-pulse" />
                    </div>
                </div>
                <div className="space-y-3">
                    <h2 className="text-3xl font-extrabold tracking-tight text-base-content">
                        👋 Welcome to <span className="text-primary">Vibbly</span>
                    </h2>
                    <p className="text-base-content/70 text-lg leading-relaxed">
                        Select a conversation from the sidebar to start chatting.<br />
                        Or simply <span className="text-primary font-medium">search for your friends</span> to begin!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NoChatSelected;
