import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Flashlight, Image as ImageIcon, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { toast } from "@/hooks/use-toast";
import { storeScanDraft } from "@/lib/scan-draft";

export default function ScanPage() {
  const [, setLocation] = useLocation();
  const [isBusy, setIsBusy] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const openCameraRef = useRef<HTMLInputElement | null>(null);
  const openGalleryRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("openGallery") !== "1") return;
    window.setTimeout(() => {
      openGalleryRef.current?.click();
    }, 60);
  }, []);

  const goToPreview = (opts: { draftId?: string; imageUri?: string; source: "camera" | "gallery" }) => {
    const params = new URLSearchParams();
    params.set("source", opts.source);
    if (opts.imageUri) params.set("imageUri", opts.imageUri);
    if (opts.draftId) params.set("draftId", opts.draftId);

    setLocation(`/preview?${params.toString()}`);
  };

  const handleCapture = () => {
    if (isBusy) return;
    openCameraRef.current?.click();
  };

  const handleFlash = () => {
    // Toggle flashlight state
    setFlashOn((prev) => !prev);

    // Note: Browser file input doesn't support torch control
    // This is a visual indicator only. Real torch control requires getUserMedia API
    // which isn't used here since we're using file input for camera access
    toast({
      title: flashOn ? "Flash Off" : "Flash On",
      description: flashOn
        ? "Camera flash disabled"
        : "Camera flash will be used when available",
    });
  };

  const handleGallery = () => {
    if (isBusy) return;
    openGalleryRef.current?.click();
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      // Validate file exists and has content
      if (!file || file.size === 0) {
        reject(new Error("File is empty or invalid"));
        return;
      }

      const reader = new FileReader();
      let resolved = false;

      // Set timeout for mobile browsers that might hang
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error("File reading timeout - file may be too large"));
        }
      }, 15000); // 15 second timeout

      reader.onload = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        const result = reader.result;
        if (typeof result === 'string' && result.startsWith('data:image/')) {
          resolve(result);
        } else {
          reject(new Error("Invalid image data format"));
        }
      };

      reader.onerror = (error) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        reject(new Error("Unable to read file - may be corrupted or unsupported format"));
      };

      reader.onabort = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        reject(new Error("File reading was aborted"));
      };

      try {
        reader.readAsDataURL(file);
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error("Failed to start file reading"));
      }
    });

  const compressImage = (file: File, maxSizeKB = 800): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let objectUrl: string | null = null;

      // Cleanup function
      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      };

      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Image loading timeout"));
      }, 10000); // 10 second timeout

      if (!ctx) {
        resolve(file); // Fallback to original if canvas fails
        return;
      }

      img.onload = () => {
        clearTimeout(timeout);
        try {
          // Calculate new dimensions (max 1920px width, maintain aspect ratio)
          let width = img.width;
          let height = img.height;
          const maxDimension = 1920;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Try different quality levels to get under maxSizeKB
          let quality = 0.85;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                cleanup();
                if (!blob) {
                  reject(new Error("Image compression failed"));
                  return;
                }

                const sizeKB = blob.size / 1024;

                // If still too large and quality can be reduced further, try again
                if (sizeKB > maxSizeKB && quality > 0.3) {
                  quality -= 0.1;
                  tryCompress();
                  return;
                }

                // Convert blob to File
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });

                resolve(compressedFile);
              },
              'image/jpeg',
              quality
            );
          };

          tryCompress();
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      img.onerror = (error) => {
        clearTimeout(timeout);
        cleanup();
        reject(new Error("Failed to load image for compression"));
      };

      try {
        objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
      } catch (error) {
        clearTimeout(timeout);
        cleanup();
        reject(new Error("Failed to create object URL"));
      }
    });
  };

  const onPickFile = async (file: File | null, source: "camera" | "gallery") => {
    if (!file) {
      // On mobile, sometimes file input returns null even when user selected
      // This can happen if the user cancels or if there's a permission issue
      console.warn("No file selected");
      return;
    }

    setIsBusy(true);
    try {
      // Validate file exists and has content (mobile Safari sometimes returns empty files)
      if (file.size === 0) {
        toast({
          title: "Empty file",
          description: "The selected file is empty. Please try again.",
        });
        return;
      }

      // Validate file type (mobile browsers might return empty type, so check extension too)
      const isValidImageType = file.type.startsWith('image/') || 
        /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);
      
      if (!isValidImageType) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, etc.).",
        });
        return;
      }

      // Validate file size (before compression)
      const maxFileSizeMB = 20;
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `Image must be under ${maxFileSizeMB}MB.`,
        });
        return;
      }

      // Handle HEIC/HEIF format (common on iPhones)
      // Note: HEIC files cannot be processed by canvas API, so we need to handle them differently
      const isHeic = /\.(heic|heif)$/i.test(file.name) || 
                     file.type === 'image/heic' || 
                     file.type === 'image/heif';
      
      if (isHeic) {
        // Try to read HEIC directly - mobile Safari might convert it automatically
        try {
          const dataUrl = await fileToDataUrl(file);
          if (dataUrl && dataUrl.startsWith('data:image/')) {
            // If we got a valid data URL, use it (Safari may have converted it)
            const draft = storeScanDraft({ source, imageDataUrl: dataUrl });
            if (draft?.draftId) {
              goToPreview({ source, draftId: draft.draftId });
              return;
            }
            goToPreview({ source, imageUri: dataUrl });
            return;
          }
        } catch (heicError) {
          console.warn("HEIC file read failed:", heicError);
          toast({
            title: "Format not supported",
            description: "HEIC format detected. Please convert to JPG in Photos app or use a different image.",
          });
          return;
        }
      }

      // Compress image if needed (files over 500KB get compressed)
      let processedFile = file;
      if (file.size > 500 * 1024) {
        try {
          processedFile = await compressImage(file);
        } catch (compressionError) {
          console.warn("Compression failed, using original:", compressionError);
          // Continue with original file if compression fails
          processedFile = file;
        }
      }

      // Validate the file is still valid before processing
      if (!processedFile || processedFile.size === 0) {
        throw new Error("Invalid file after processing");
      }

      const dataUrl = await fileToDataUrl(processedFile);
      
      // Validate data URL was created successfully
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        throw new Error("Failed to convert file to data URL");
      }

      // Additional validation: check data URL length
      const maxLength = 6_500_000; // From AI_LIMITS
      if (dataUrl.length > maxLength) {
        toast({
          title: "Image too large",
          description: "Please try a smaller photo.",
        });
        return;
      }

      const draft = storeScanDraft({ source, imageDataUrl: dataUrl });
      if (draft?.draftId) {
        goToPreview({ source, draftId: draft.draftId });
        return;
      }

      // fallback path when session storage is unavailable
      goToPreview({ source, imageUri: dataUrl });
    } catch (error) {
      console.error("Image processing error:", error);
      console.error("File details:", {
        name: file?.name,
        type: file?.type,
        size: file?.size,
        source,
      });
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // More specific error messages for mobile
      let description = "Please try another photo or check your camera permissions.";
      if (errorMessage.includes("timeout")) {
        description = "Image took too long to process. Please try a smaller photo.";
      } else if (errorMessage.includes("compression") || errorMessage.includes("Failed to load image")) {
        description = "Could not process image. Try selecting from gallery instead.";
      } else if (errorMessage.includes("Unable to read file") || errorMessage.includes("corrupted")) {
        description = "File could not be read. Try taking a new photo or selecting from gallery.";
      } else if (errorMessage.includes("Invalid image data")) {
        description = "Image format not supported. Please use JPG or PNG.";
      }
      
      toast({
        title: "Image load failed",
        description,
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div data-testid="screen-camera" className="relative h-screen w-full bg-black overflow-hidden font-sans">
      <input
        data-testid="input-camera-capture-file"
        ref={openCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          // Reset input to allow selecting same file again
          e.currentTarget.value = "";
          
          // Small delay on mobile to ensure file is fully available
          if (file) {
            // On mobile, sometimes the file needs a moment to be readable
            setTimeout(() => {
              void onPickFile(file, "camera");
            }, 100);
          }
        }}
      />
      <input
        data-testid="input-camera-gallery"
        ref={openGalleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          // Reset input to allow selecting same file again
          e.currentTarget.value = "";
          
          // Small delay on mobile to ensure file is fully available
          if (file) {
            setTimeout(() => {
              void onPickFile(file, "gallery");
            }, 100);
          }
        }}
      />
      {/* 1. Viewfinder Layer */}
      <div className="absolute inset-0 z-0">
        <SafeImage
          data-testid="img-camera-view"
          src="/images/food-hero-bg.png"
          alt="Camera View"
          loading="eager"
          fallbacks={["/images/recipe-pasta.png"]}
          className="w-full h-full object-cover transition-all duration-500"
        />
      </div>

      {/* 2. UI Overlay Layer */}
      <AnimatePresence>
        {(
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col justify-between p-6 pb-12 pointer-events-none"
          >
            {/* Top Controls */}
            <div className="flex justify-between items-start pointer-events-auto">
              <Link
                href="/home"
                data-testid="link-camera-back"
                aria-label="Back"
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div
                data-testid="badge-camera-ai-active"
                className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-bold tracking-wide border border-white/10 flex items-center gap-2"
              >
                <Sparkles size={12} className="text-orange-400" />
                AI LENS ACTIVE
              </div>
              <button
                data-testid="button-camera-flash"
                onClick={handleFlash}
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-colors ${
                  flashOn
                    ? "bg-[hsl(var(--ring)/0.3)] border-[hsl(var(--ring)/0.6)] text-[hsl(var(--ring))]"
                    : "bg-black/40 border-white/10 text-white hover:bg-white/10"
                }`}
              >
                <Flashlight size={20} fill={flashOn ? "currentColor" : "none"} />
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between px-4 pointer-events-auto">
              <button
                data-testid="button-camera-gallery"
                onClick={handleGallery}
                disabled={isBusy}
                className={
                  "w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 transition-colors " +
                  (isBusy ? "opacity-60" : "hover:bg-white/10")
                }
              >
                <ImageIcon size={20} />
              </button>

              {/* Capture */}
              <button
                data-testid="button-camera-capture"
                onClick={handleCapture}
                aria-label="Take photo"
                disabled={isBusy}
                className={
                  "w-20 h-20 rounded-full border-[3px] flex items-center justify-center p-1 group transition " +
                  (isBusy ? "border-white/15 opacity-60" : "border-white/30")
                }
              >
                <div
                  className={
                    "w-full h-full rounded-full transition-all duration-300 flex items-center justify-center " +
                    (isBusy ? "bg-white/10" : "bg-white group-active:scale-90")
                  }
                >
                  <span data-testid="text-camera-capture" className="text-[10px] font-bold tracking-wide text-black/70">
                    Capture
                  </span>
                </div>
              </button>

              <div className="w-12 h-12" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
