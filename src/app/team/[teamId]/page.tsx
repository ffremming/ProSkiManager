"use client";

import { useParams } from "next/navigation";
import { TeamDetail } from "../../../components/team/TeamDetail";

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = Array.isArray(params?.teamId) ? params.teamId[0] : (params?.teamId as string);
  return <TeamDetail teamId={teamId} showBackLink />;
}
