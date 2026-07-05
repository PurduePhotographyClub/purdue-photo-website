import { Film, Monitor } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";

type FacilityType = "film" | "digital" | "both";

interface Facility {
  title: string;
  desc: string;
  img: string;
  type: FacilityType;
}

const facilities: Facility[] = [
  { title: "Darkroom", desc: "The PMU basement darkroom is open to members with club membership and facilities access. Members can develop color, black-and-white, and slide film from 110 through 8x10. Color and slide film run through the Jobo Autolab ATL 2 Plus; slide processing depends on supplies and may cost extra.",
    img: "https://images.unsplash.com/photo-1698899114689-1d150e8cfa7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrcm9vbSUyMHBob3RvZ3JhcGh5JTIwZGV2ZWxvcGluZ3xlbnwxfHx8fDE3NzUzNDgyMzN8MA&ixlib=rb-4.1.0&q=80&w=1080", type: "film" },
  { title: "Enlarging", desc: "Members can make color and black-and-white prints with enlargers that support film up to 4x5. Lenses range from 50mm to 135mm. RA-4 color prints are processed through the Jobo Autolab ATL 2 Plus.",
    img: "https://images.unsplash.com/photo-1764557222681-5b07c67897e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90byUyMGVkaXRpbmclMjBjb21wdXRlciUyMHNjcmVlbiUyMGxpZ2h0cm9vbXxlbnwxfHx8fDE3NzUzNDg2MTl8MA&ixlib=rb-4.1.0&q=80&w=1080", type: "film" },
  { title: "Digitization & Scanning", desc: "The current film scanning setup uses a Sony A7RII, Nikon macro bellows, and a 55mm f/2.8 macro lens. It is built for high-resolution digitization, and the setup may change as the club upgrades gear.",
    img: "https://images.unsplash.com/photo-1516635572575-84ee3373085c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", type: "both" },
  { title: "Studio Space", desc: "Four hundred square feet for portraits, product work, and small creative sets. Members can use club lighting, stands, backdrops, and basic studio gear for film or digital shoots.",
    img: "https://images.unsplash.com/photo-1745848038063-bbb6fc8c8867?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90b2dyYXBoeSUyMHN0dWRpbyUyMGVxdWlwbWVudCUyMGxpZ2h0aW5nfGVufDF8fHx8MTc3NTM0ODIzNXww&ixlib=rb-4.1.0&q=80&w=1080", type: "both" },
  { title: "Equipment Library", desc: "Members can borrow cameras, lenses, lighting kits, tripods, and accessories for club projects. Check availability before planning a shoot, since gear moves in and out.",
    img: "https://images.unsplash.com/photo-1772771841348-a9fb229fd81b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwY2FtZXJhJTIwbWlycm9ybGVzcyUyMG1vZGVybnxlbnwxfHx8fDE3NzUzNDg2MDB8MA&ixlib=rb-4.1.0&q=80&w=1080", type: "both" },
];

export default function Facilities() {
  const heading = "text-neutral-100";
  const mutedText = "text-neutral-500";
  const faintText = "text-neutral-600";
  const subText = "text-neutral-400";
  const border = "border-neutral-800";

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <p className={`text-xs tracking-[0.4em] uppercase ${mutedText} mb-4`}>Facilities Access</p>
          <h1 className={`text-4xl md:text-5xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>Our Facilities</h1>
          <p className={`text-sm ${mutedText} tracking-wider mt-4`}>Darkroom, enlarging, scanning, studio, and equipment access in the PMU basement.</p>
        </div>
        <div className="space-y-24">
          {facilities.map((fac, i) => (
            <div key={fac.title}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className={`${i % 2 === 1 ? "md:order-2" : ""}`}>
                <div className="relative overflow-hidden aspect-[4/3]">
                  <ImageWithFallback src={fac.img} alt={fac.title}
                    className={`w-full h-full object-cover hover:scale-105 transition-all duration-700 ${fac.type === "film" ? "grayscale hover:grayscale-0" : ""}`} />
                  <div className={`absolute inset-0 border ${border}`} />
                  <div className="absolute top-4 left-4">
                    <span className={`flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 ${
                      fac.type === "film" ? "bg-neutral-900/90 text-neutral-400 border border-neutral-700" :
                      fac.type === "digital" ? "bg-white/10 backdrop-blur-sm text-neutral-300" :
                      "bg-neutral-900/80 backdrop-blur-sm text-neutral-300 border border-neutral-700"
                    }`}>
                      {fac.type === "film" && <><Film size={9} /> Film</>}
                      {fac.type === "digital" && <><Monitor size={9} /> Digital</>}
                      {fac.type === "both" && <><Film size={9} /> + <Monitor size={9} /> Both</>}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`${i % 2 === 1 ? "md:order-1" : ""}`}>
                <p className={`text-xs tracking-[0.3em] uppercase ${faintText} mb-3`}>0{i + 1}</p>
                <h2 className={`text-2xl tracking-wider mb-4 ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>{fac.title}</h2>
                <p className={`text-sm ${subText} tracking-wider leading-relaxed select-text`}>{fac.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Directions & Map */}
        <div className={`mt-32 border-t ${border} pt-20`}>
          <div className="text-center mb-16">
            <p className={`text-xs tracking-[0.4em] uppercase ${mutedText} mb-4`}>Directions</p>
            <h2 className={`text-3xl md:text-4xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>Finding Us</h2>
            <p className={`text-sm ${mutedText} tracking-wider mt-4`}>Follow the marked PMU basement paths to reach the darkroom and studio.</p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Map Image */}
            <div className="relative overflow-hidden border border-neutral-800 mb-10">
              <img
                src="/DarkroomStudio_Map.webp"
                alt="PMU Floor Map, Red and Blue paths to the darkroom"
                className="w-full h-auto"
              />
            </div>

            {/* Path Directions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {/* Red Path */}
              <div className="border border-neutral-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-1 bg-red-400 rounded-full" />
                  <h3 className="text-xs tracking-[0.2em] uppercase text-red-300" style={{ fontFamily: "'Playfair Display', serif" }}>Red Path</h3>
                  <span className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border border-neutral-700 ${mutedText}`}>Default</span>
                </div>
                <p className={`text-sm ${subText} tracking-wider leading-relaxed select-text`}>
                  Normally use this one. Message whomever you are meeting once you have arrived.
                </p>
              </div>

              {/* Blue Path */}
              <div className="border border-neutral-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-1 bg-blue-300 rounded-full" />
                  <h3 className="text-xs tracking-[0.2em] uppercase text-blue-300" style={{ fontFamily: "'Playfair Display', serif" }}>Blue Path</h3>
                  <span className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border border-neutral-700 ${mutedText}`}>Alternate</span>
                </div>
                <p className={`text-sm ${subText} tracking-wider leading-relaxed select-text`}>
                  Use if told to do so, or if the person you are meeting does not respond.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
