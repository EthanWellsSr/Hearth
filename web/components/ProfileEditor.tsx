"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useActionState } from "react";
import { MemberAvatar } from "./MemberAvatar";
import {
  AVATAR_INPUT_MAX_BYTES,
  DISPLAY_NAME_MAX_LENGTH,
  DEFAULT_AVATAR_URL,
} from "@/lib/profile";
import { saveProfile, type ProfileActionState } from "@/app/profile/actions";

const initialState: ProfileActionState = { error: null };

function rotatedSize(width: number, height: number, rotation: number) {
  const radians = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function cropAvatar(src: string, area: Area, rotation: number) {
  const image = await loadImage(src);
  const bounds = rotatedSize(image.naturalWidth, image.naturalHeight, rotation);
  const source = document.createElement("canvas");
  source.width = Math.ceil(bounds.width);
  source.height = Math.ceil(bounds.height);
  const sourceContext = source.getContext("2d");
  if (!sourceContext) throw new Error("Canvas is unavailable");

  sourceContext.translate(source.width / 2, source.height / 2);
  sourceContext.rotate((rotation * Math.PI) / 180);
  sourceContext.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  sourceContext.drawImage(image, 0, 0);

  const output = document.createElement("canvas");
  output.width = 512;
  output.height = 512;
  const outputContext = output.getContext("2d");
  if (!outputContext) throw new Error("Canvas is unavailable");
  outputContext.drawImage(
    source,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    512,
    512
  );

  return new Promise<Blob>((resolve, reject) => {
    output.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image conversion failed"))),
      "image/jpeg",
      0.9
    );
  });
}

async function browserReadyImage(file: File) {
  const isHeic = /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
  if (!isHeic) return file;

  const { heicTo } = await import("heic-to");
  return heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
}

export function ProfileEditor({
  initialName,
  initialAvatarUrl,
  setup = false,
}: {
  initialName: string;
  initialAvatarUrl?: string | null;
  setup?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  async function choosePhoto(file?: File) {
    if (!file) return;
    setLocalError(null);
    if (file.size > AVATAR_INPUT_MAX_BYTES) {
      setLocalError("Choose a photo smaller than 10 MB.");
      return;
    }
    if (!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name) &&
        !/image\/(jpeg|png|webp|hei[cf])/i.test(file.type)) {
      setLocalError("Choose a JPEG, PNG, WebP, or HEIC photo.");
      return;
    }

    try {
      const ready = await browserReadyImage(file);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(ready);
      setSource(objectUrl.current);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedArea(null);
      setRemoveAvatar(false);
    } catch {
      setLocalError("That HEIC photo could not be opened. Try another photo.");
    }
  }

  async function submit(formData: FormData) {
    setLocalError(null);
    try {
      if (source && croppedArea) {
        const blob = await cropAvatar(source, croppedArea, rotation);
        const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        formData.set(
          "avatar",
          new File([blob], `avatar-source.${extension}`, {
            type: blob.type || "application/octet-stream",
          })
        );
      }
      formData.set("remove_avatar", String(removeAvatar));
      startTransition(() => formAction(formData));
    } catch {
      setLocalError("Hearth could not prepare that photo. Please choose it again.");
    }
  }

  const shownAvatar = removeAvatar ? DEFAULT_AVATAR_URL : source || initialAvatarUrl;

  return (
    <form action={submit} className="card botanical-card flex flex-col gap-6 p-5 sm:p-7">
      <input type="hidden" name="destination" value={setup ? "setup" : "profile"} />

      <div className="flex items-center gap-4">
        <MemberAvatar src={shownAvatar} name={initialName || "Your"} size={72} />
        <div>
          <p className="font-semibold text-stone-800">Your Avatar</p>
          <p className="mt-1 text-sm leading-5 text-stone-500">
            Add a photo, or keep the Hearth logo.
          </p>
        </div>
      </div>

      <label>
        <span className="subtle-label">Your name</span>
        <input
          name="display_name"
          defaultValue={initialName}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          className="field w-full"
          autoComplete="name"
          required
        />
        <span className="mt-1.5 block text-xs text-stone-400">This is how your Household will see you.</span>
      </label>

      <div>
        <span className="subtle-label">Photo</span>
        <div className="flex flex-wrap gap-2">
          <label className="btn-ghost cursor-pointer border border-emerald-200 bg-white/70">
            Choose photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              className="sr-only"
              onChange={(event) => void choosePhoto(event.target.files?.[0])}
            />
          </label>
          {(source || (initialAvatarUrl && initialAvatarUrl !== DEFAULT_AVATAR_URL)) && !removeAvatar && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setSource(null);
                setRemoveAvatar(true);
              }}
            >
              Use Hearth logo
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-stone-400">JPEG, PNG, WebP, or HEIC · up to 10 MB</p>
      </div>

      {source && (
        <section aria-label="Avatar editor" className="rounded-[1.25rem] border border-emerald-200 bg-stone-900/95 p-3">
          <div className="relative h-72 overflow-hidden rounded-2xl">
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/10 p-3 text-xs text-white">
            <label className="flex min-w-44 flex-1 items-center gap-2">
              <span>Zoom</span>
              <input
                aria-label="Avatar zoom"
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-emerald-400"
              />
            </label>
            <button
              type="button"
              onClick={() => setRotation((value) => (value + 90) % 360)}
              className="rounded-full bg-white/15 px-3 py-2 font-semibold hover:bg-white/25"
            >
              Rotate 90°
            </button>
          </div>
        </section>
      )}

      {(localError || state.error) && (
        <p role="alert" className="status-message bg-red-500/10 text-red-700">
          {localError || state.error}
        </p>
      )}

      <div className="soft-divider" />
      <button type="submit" className="btn-primary self-stretch sm:self-end" disabled={pending || Boolean(source && !croppedArea)}>
        {pending ? "Saving…" : source && !croppedArea ? "Preparing photo…" : setup ? "Continue" : "Save profile"}
      </button>
    </form>
  );
}
