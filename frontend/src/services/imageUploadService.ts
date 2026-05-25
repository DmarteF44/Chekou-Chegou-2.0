import * as ImagePicker from "expo-image-picker";
import { USE_SUPABASE, friendlySupabaseError, isSupabaseUnavailable } from "@/src/config/runtime";
import { supabase } from "@/src/lib/supabase";

const BUCKET = "chekou-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

export type PickedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

function extensionFor(imageUri: string): string {
  const match = imageUri.split("?")[0].match(/\.([a-z0-9]+)$/i);
  const extension = match?.[1]?.toLowerCase() ?? "jpg";
  return ALLOWED_EXTENSIONS.has(extension) ? extension : "jpg";
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_") || "new";
}

export async function pickImageFromGallery(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permita acesso à galeria para selecionar uma imagem.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]) return null;
  const selected = result.assets[0];
  const mime = selected.mimeType?.toLowerCase() ?? "";
  const extension = extensionFor(selected.fileName ?? selected.uri);
  if (!(mime === "" || mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Selecione uma imagem JPG, PNG ou WEBP.");
  }
  if (selected.fileSize && selected.fileSize > MAX_IMAGE_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }
  return {
    uri: selected.uri,
    fileName: selected.fileName,
    mimeType: selected.mimeType,
    fileSize: selected.fileSize,
  };
}

async function uploadImage(folder: string, entityId: string, localUri: string): Promise<string> {
  const uri = localUri.trim();
  if (!uri) return "";
  if (!(USE_SUPABASE && supabase) || /^https?:\/\//i.test(uri)) return uri;
  try {
    const response = await fetch(uri);
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_IMAGE_BYTES) throw new Error("A imagem deve ter no máximo 5 MB.");
    const responseType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase();
    const contentType = responseType === "image/png" || responseType === "image/webp" || responseType === "image/jpeg"
      ? responseType
      : `image/${extensionFor(uri) === "jpg" ? "jpeg" : extensionFor(uri)}`;
    const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
    const path = `${folder}/${safePathSegment(entityId)}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: false });
    if (error) throw error;
    return getPublicImageUrl(path);
  } catch (error) {
    if (error instanceof Error && error.message.includes("5 MB")) throw error;
    if (isSupabaseUnavailable(error)) {
      console.warn("Storage indisponível; mantendo imagem local temporária.", error);
      return uri;
    }
    throw new Error(friendlySupabaseError(error, "Não foi possível enviar a imagem."));
  }
}

export async function uploadProductImage(productId: string, localUri: string): Promise<string> {
  return uploadImage("products", productId, localUri);
}

export async function uploadStoreImage(storeId: string, localUri: string): Promise<string> {
  return uploadImage("stores", storeId, localUri);
}

export async function uploadCouponImage(couponId: string, localUri: string): Promise<string> {
  return uploadImage("coupons", couponId, localUri);
}

export function getPublicImageUrl(path: string): string {
  if (!supabase) return path;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
