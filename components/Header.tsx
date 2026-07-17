type HeaderProps = {
  name: string;
};

export default function Header({ name }: HeaderProps) {
  const hour = new Date().getHours();

  let greeting = "ערב טוב";

  if (hour >= 5 && hour < 12) greeting = "בוקר טוב";
  else if (hour >= 12 && hour < 18) greeting = "צהריים טובים";

  return (
    <header className="flex items-center justify-between">
      <button className="text-3xl text-[#D4AF37] transition hover:opacity-80">
        ☰
      </button>

      <div className="text-center">
        <h1 className="text-5xl font-black tracking-wider bg-gradient-to-r from-[#8B6B1F] via-[#D4AF37] to-[#FFF2C7] bg-clip-text text-transparent">
          START
        </h1>

        <h2 className="mt-6 text-4xl font-bold text-white">
          {greeting},{" "}
          <span className="text-[#D4AF37]">{name}</span>
        </h2>

        <p className="mt-2 text-gray-400 text-lg">
          מוכנים להמשיך את הדרך שלך?
        </p>
      </div>

      <div className="relative">
        <img
          src="https://i.pravatar.cc/150"
          alt="profile"
          className="w-14 h-14 rounded-full border-2 border-[#D4AF37]"
        />

        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-black" />
      </div>
    </header>
  );
}