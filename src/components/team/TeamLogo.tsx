import React from "react";

export function TeamLogo({ team, size = 48 }: { team: any; size?: number }) {
  const logo = team?.logo || (team?.name ? `/team-logos/${slugify(team.name)}.png` : "");
  if (!logo) return <div style={{ width: size, height: size }} className="rounded-full bg-white/10" />;
  return (
    <img
      src={logo}
      alt={`${team?.name || "Team"} logo`}
      className="rounded-full object-contain bg-white/10 p-1"
      style={{ width: size, height: size }}
      loading="lazy"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

function slugify(str: string) {
  return (str || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
