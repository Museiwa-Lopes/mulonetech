import path from "path";
import { mkdir, unlink, writeFile } from "fs/promises";

function cleanFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildObjectPath(folder: string, originalName: string, fallbackName: string) {
  const extension = originalName.includes(".") ? originalName.split(".").pop() : "jpg";
  const safeFileName = `${Date.now()}-${cleanFileName(originalName || `${fallbackName}.${extension}`)}`;
  return `${folder.replaceAll("\\", "/")}/${safeFileName}`;
}

function getBucketName() {
  return (process.env.SUPABASE_UPLOADS_BUCKET ?? "uploads").trim();
}

function isVercelRuntime() {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_URL);
}

async function getSupabaseServiceClient() {
  try {
    const supabaseModule = await import("@/lib/supabase/service");
    return supabaseModule.createSupabaseServiceClient();
  } catch {
    return null;
  }
}

function getSupabaseAssetPathFromUrl(url: string) {
  const marker = "/storage/v1/object/public/";
  const index = url.indexOf(marker);
  if (index < 0) {
    return null;
  }

  const raw = url.slice(index + marker.length);
  const firstSlash = raw.indexOf("/");
  if (firstSlash < 0) {
    return null;
  }

  const bucket = raw.slice(0, firstSlash);
  const objectPath = raw.slice(firstSlash + 1);
  return { bucket, objectPath };
}

export async function uploadImage(file: File, folder: string, fallbackName: string) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  const objectPath = buildObjectPath(folder, file.name, fallbackName);
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = await getSupabaseServiceClient();
  const bucket = getBucketName();
  if (supabase && bucket) {
    const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    return data.publicUrl;
  }

  // On Vercel serverless runtime, writing to local filesystem is not persistent/reliable.
  if (isVercelRuntime()) {
    return null;
  }

  const localFolder = path.join(process.cwd(), "public", "uploads", folder);
  const localPath = path.join(localFolder, path.basename(objectPath));
  try {
    await mkdir(localFolder, { recursive: true });
    await writeFile(localPath, buffer);
  } catch {
    return null;
  }

  return path.posix.join("/uploads", folder.replaceAll("\\", "/"), path.basename(objectPath));
}

export async function deleteUploadedAsset(assetUrl: string) {
  if (!assetUrl) {
    return;
  }

  const supabase = await getSupabaseServiceClient();
  const parsed = getSupabaseAssetPathFromUrl(assetUrl);
  if (supabase && parsed) {
    await supabase.storage.from(parsed.bucket).remove([parsed.objectPath]);
    return;
  }

  if (assetUrl.startsWith("/uploads/")) {
    if (isVercelRuntime()) {
      return;
    }
    const filePath = path.join(
      process.cwd(),
      "public",
      assetUrl.replace(/^\//, "").replaceAll("/", path.sep)
    );
    try {
      await unlink(filePath);
    } catch {
      // ignore missing files
    }
  }
}
