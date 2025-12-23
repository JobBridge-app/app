export default function MessagesPage() {
    // Shared page for now, UI can differ inside if needed, 
    // but navigation.ts only links here for providers currently.
    // Seekers access chats via activity for now (as per plan), 
    // but direct link access is fine/safe.

    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-8">Nachrichten</h1>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
                <p className="text-slate-300">Hier siehst du deine Chats.</p>
            </div>
        </div>
    );
}
