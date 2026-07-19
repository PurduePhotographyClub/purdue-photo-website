import { useState } from "react";
import useSWR from "swr";
import { GALLERY_TAGS, parseGalleryTags } from "@/lib/gallery-tags";
import { fetchPublicJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";
import { normalizeProfileResponse } from "@/lib/profile-model";
import {
  normalizePublicProfileStatistics,
  type PublicProfileStatistics,
} from "@/lib/profile-statistics";
import ProfileGallery, {
  type ProfileGalleryMeta,
  type ProfileGalleryPhoto,
} from "./ProfileGallery";
import ProfileTemplateRenderer, {
  type PublicProfileIdentity,
} from "./ProfileTemplateRenderer";

interface Props {
  identifier: string;
}

interface PublicProfilePayload {
  availableTags: string[];
  meta: ProfileGalleryMeta;
  photos: ProfileGalleryPhoto[];
  profile: PublicProfileIdentity;
  statistics: PublicProfileStatistics;
}

const EMPTY_META: ProfileGalleryMeta = {
  hasNextPage: false,
  hasPreviousPage: false,
  page: 1,
  perPage: 15,
  total: 0,
  totalPages: 1,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readInteger(value: unknown, fallback: number, minimum = 0) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum
    ? value
    : fallback;
}

function readNullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readGalleryImageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  return /^\/api\/(?:v1\/)?gallery\/image\/photo\/[^\s/?#]+(?:\?variant=thumbnail)?$/.test(value)
    ? value
    : null;
}

function normalizePhoto(value: unknown, anonymous: boolean): ProfileGalleryPhoto | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const imageUrl = readGalleryImageUrl(value.imageUrl);
  if (!imageUrl) return null;
  const thumbnailUrl = readGalleryImageUrl(value.thumbnailUrl) || imageUrl;
  const width = readInteger(value.width, 0, 1) || null;
  const height = readInteger(value.height, 0, 1) || null;

  return {
    camera: anonymous ? null : readNullableText(value.camera),
    createdAt: readNullableText(value.createdAt),
    description: readNullableText(value.description),
    height,
    id: value.id,
    imageUrl,
    lens: anonymous ? null : readNullableText(value.lens),
    metadataHidden: anonymous || value.metadataHidden === true,
    tags: parseGalleryTags(readNullableText(value.tags)).join(", ") || null,
    thumbnailUrl,
    title: readNullableText(value.title),
    width,
  };
}

function normalizePublicProfilePayload(value: unknown): PublicProfilePayload {
  const root = isRecord(value) && isRecord(value.data) ? value.data : value;
  const response = isRecord(root) ? root : {};
  const rawProfile = isRecord(response.profile) ? response.profile : {};
  const normalized = normalizeProfileResponse({ profile: rawProfile }, "PPC member").profile;
  const anonymous = rawProfile.anonymous === true;
  const template = normalized.template;
  const rawMeta = isRecord(response.meta) ? response.meta : {};
  const totalPages = readInteger(rawMeta.totalPages, 1, 1);
  const page = Math.min(readInteger(rawMeta.page, 1, 1), totalPages);
  const rawPhotos = Array.isArray(response.photos) ? response.photos : [];
  const allowedTags = new Set<string>(GALLERY_TAGS);
  const availableTags = !Array.isArray(response.availableTags)
    ? []
    : response.availableTags.filter(
      (tag): tag is string => typeof tag === "string" && allowedTags.has(tag),
    );

  return {
    availableTags: [...new Set(availableTags)],
    meta: {
      hasNextPage: rawMeta.hasNextPage === true || page < totalPages,
      hasPreviousPage: rawMeta.hasPreviousPage === true || page > 1,
      page,
      perPage: readInteger(rawMeta.perPage, 15, 1),
      total: readInteger(rawMeta.total, 0),
      totalPages,
    },
    photos: rawPhotos.flatMap((photo) => {
      const normalizedPhoto = normalizePhoto(photo, anonymous);
      return normalizedPhoto ? [normalizedPhoto] : [];
    }),
    profile: {
      anonymous,
      avatarPositionX: anonymous ? 50 : normalized.avatarPositionX,
      avatarPositionY: anonymous ? 50 : normalized.avatarPositionY,
      avatarShape: anonymous ? "auto" : normalized.avatarShape,
      avatarUrl: anonymous ? null : normalized.avatarUrl,
      avatarZoom: anonymous ? 100 : normalized.avatarZoom,
      bio: anonymous ? null : normalized.bio || null,
      decoration: normalized.decoration,
      displayName: anonymous ? "PPC Member" : normalized.displayName,
      nameStyle: anonymous ? "classic" : normalized.nameStyle,
      palette: normalized.palette,
      socialStyle: anonymous ? "tiles" : normalized.socialStyle,
      socials: anonymous ? [] : normalized.socials,
      specialties: anonymous ? [] : normalized.specialties,
      template,
      username: anonymous ? null : normalized.username || null,
    },
    statistics: normalizePublicProfileStatistics(response.stats, anonymous),
  };
}

export default function PublicProfile({ identifier }: Props) {
  const [page, setPage] = useState(1);
  const [selectedTag, setSelectedTag] = useState("All");
  const tagQuery = selectedTag === "All" ? "" : `&tag=${encodeURIComponent(selectedTag)}`;
  const endpoint = `/api/profiles/${encodeURIComponent(identifier)}?page=${page}&per_page=15${tagQuery}`;
  const { data, error, isLoading, mutate } = useSWR<unknown>(
    endpoint,
    fetchPublicJson,
    PUBLIC_API_SWR_OPTIONS,
  );
  const payload = data ? normalizePublicProfilePayload(data) : null;
  const anonymousLabel = "PPC Member profile";

  if (!payload && error) {
    return (
      <main className="mx-auto min-h-[60dvh] max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl border border-neutral-800 px-5 py-14 text-center">
          <p className="text-[9px] uppercase tracking-[0.28em] text-neutral-600">Member mini-portfolio</p>
          <h1 className="mt-4 text-2xl text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>Profile unavailable</h1>
          <p role="alert" className="mt-3 text-xs leading-5 text-neutral-500">This profile is disabled, missing, or temporarily unavailable.</p>
          <button type="button" onClick={() => void mutate()} className="mt-6 min-h-11 border border-neutral-700 px-5 text-[10px] uppercase tracking-wider text-neutral-300 hover:border-neutral-500">Try again</button>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main aria-label="Loading member profile" className="mx-auto min-h-[60dvh] max-w-7xl animate-pulse px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <div className="grid gap-7 border-b border-neutral-800 pb-9 md:grid-cols-[160px_minmax(0,1fr)] md:gap-9 lg:grid-cols-[176px_minmax(0,1fr)]">
          <div className="aspect-square w-32 bg-neutral-900 sm:w-40 lg:w-44" />
          <div className="min-w-0 space-y-4">
            <div className="h-3 w-36 bg-neutral-900" />
            <div className="h-10 max-w-lg bg-neutral-900" />
            <div className="h-7 max-w-sm bg-neutral-900" />
            <div className="h-16 max-w-2xl bg-neutral-900" />
          </div>
        </div>
        <div className="mt-8 columns-1 gap-2 sm:columns-2 lg:columns-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="mb-2 aspect-square break-inside-avoid bg-neutral-900" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[60dvh] max-w-7xl px-4 sm:px-6 lg:px-8">
      <span className="sr-only">{payload.profile.anonymous ? anonymousLabel : "Member photographer profile"}</span>
      <ProfileTemplateRenderer profile={payload.profile} statistics={payload.statistics}>
        <ProfileGallery
          availableTags={payload.availableTags}
          loading={isLoading}
          meta={payload.meta || EMPTY_META}
          metadataHidden={payload.profile.anonymous}
          onPageChange={setPage}
          onRetry={() => void mutate()}
          onTagChange={(tag) => {
            setSelectedTag(tag);
            setPage(1);
          }}
          photos={payload.photos}
          requestError={error ? "Unable to load these photographs." : ""}
          selectedTag={selectedTag}
          template={payload.profile.template}
        />
      </ProfileTemplateRenderer>
    </main>
  );
}
