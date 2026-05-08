export default function Container({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-6 py-4">
            {children}
        </div>
    )
}