"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { ArrowLeft, Mail, AtSign } from "lucide-react";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const uid = params.uid as string;
  const { user: userService } = useServices();

  const { data: profileUser, isLoading } = useQuery({
    queryKey: ["publicProfile", uid],
    queryFn: () => userService.getUser(uid),
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-trevio-200 border-t-trevio-600" />
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="p-4 md:p-6">
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-slate-500">User not found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="bg-gradient-to-br from-trevio-500 to-trevio-700 p-6 flex flex-col items-center text-center">
          {profileUser.photoURL ? (
            <img src={profileUser.photoURL} alt={profileUser.displayName} className="h-20 w-20 rounded-full border-4 border-white/30" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
              {profileUser.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="mt-3 text-xl font-bold text-white">{profileUser.displayName}</h1>
          <p className="text-sm text-white/80">@{profileUser.username}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-trevio-50">
              <AtSign className="h-4 w-4 text-trevio-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Username</p>
              <p className="text-sm font-medium text-slate-900">@{profileUser.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <Mail className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm font-medium text-slate-900">{profileUser.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
