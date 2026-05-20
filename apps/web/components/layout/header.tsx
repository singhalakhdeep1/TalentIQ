export function Header() {
    return (
        <header className="border-b border-white/10 bg-[#090f1c]/80 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-semibold">Hiring Intelligence</h1>
                    <p className="text-sm text-textMuted">Event-driven, AI-assisted recruitment operations</p>
                </div>
                <div className="panel rounded-full px-4 py-2 text-sm text-textMuted">Live system status: healthy</div>
            </div>
        </header>
    );
}
