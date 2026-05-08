interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    text: string;
    icon?: React.ReactNode;
}

export default function Button({ text, onClick, icon, type = "button", ...props }: ButtonProps) {
    return (
        <button 
            type={type}
            onClick={onClick} 
            className="w-full hover:scale-[102%] transition-all active:scale-[99%] flex items-center justify-center gap-2 uppercase bg-flota-blue hover:bg-flota-blue-press text-white px-4 py-2 rounded-lg tracking-wide font-semibold"
            {...props}
        >
            {icon}{text}
        </button>
    )
}