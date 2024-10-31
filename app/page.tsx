"use client";

import React, { useState, ChangeEvent } from "react";
import { Upload, X, FileDown, Loader2, AlertTriangle } from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import jsPDF from "jspdf";

interface ImageFile {
  file: File;
  preview: string;
}

const ImageToPdfConverter: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  const showAlert = (message: string): void => {
    setAlertMessage(message);
    setIsAlertOpen(true);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>): void => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => file.type.startsWith("image/"));

    if (validFiles.length !== files.length) {
      showAlert("Please upload only image files");
      return;
    }

    const newImages: ImageFile[] = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number): void => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleConvert = async (): Promise<void> => {
    if (images.length === 0) {
      showAlert("Please upload at least one image");
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      // Load all images first
      const loadedImages = await Promise.all(
        images.map(
          (image) =>
            new Promise<{
              img: HTMLImageElement;
              width: number;
              height: number;
            }>((resolve) => {
              const img = new Image();
              img.src = image.preview;
              img.onload = () => {
                resolve({
                  img,
                  width: img.width,
                  height: img.height,
                });
              };
            })
        )
      );

      // Calculate PDF dimensions
      const pageWidth = 595.28; // A4 width in points (8.27 × 11.69 inches)
      let maxWidth = 0;
      let totalHeight = 0;
      const margin = 20; // Margin in points
      const spacing = 10; // Spacing between images in points

      // Calculate scaled dimensions for each image
      const scaledImages = loadedImages.map(({ img, width, height }) => {
        const scaleFactor = (pageWidth - 2 * margin) / width;
        const scaledWidth = width * scaleFactor;
        const scaledHeight = height * scaleFactor;
        maxWidth = Math.max(maxWidth, scaledWidth);
        totalHeight += scaledHeight;
        return { img, scaledWidth, scaledHeight };
      });

      // Add spacing between images
      totalHeight += spacing * (images.length - 1);

      // Create PDF with calculated dimensions
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [pageWidth, totalHeight + 2 * margin],
      });

      // Add images to PDF
      let currentY = margin;
      for (let i = 0; i < scaledImages.length; i++) {
        const { img, scaledWidth, scaledHeight } = scaledImages[i];
        const centerX = (pageWidth - scaledWidth) / 2;

        pdf.addImage(img, "JPEG", centerX, currentY, scaledWidth, scaledHeight);

        currentY += scaledHeight + (i < scaledImages.length - 1 ? spacing : 0);
        setProgress(Math.round(((i + 1) / images.length) * 100));
      }

      setProgress(100);

      // Save the PDF
      pdf.save("combined-images.pdf");
      showAlert("PDF has been successfully created and downloaded!");
    } catch (error) {
      console.error(error);
      showAlert("Error converting images to PDF. Please try again.");
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        {/* Header */}
        <div className="text-center p-8 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 font-jakarta">
            Image to PDF Converter
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-jakarta text-lg">
            Convert your images to PDF in seconds
          </p>
        </div>

        {/* Upload Area */}
        <div className="p-8">
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            <div className="flex flex-col items-center justify-center px-4 py-6">
              <Upload className="w-12 h-12 text-gray-400 dark:text-gray-300 mb-4" />
              <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                Click to upload or drag and drop
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                PNG, JPG, GIF up to 10MB
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
            />
          </label>
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-8 border-t border-gray-200 dark:border-gray-700">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden shadow-md"
              >
                <img
                  src={image.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-48 object-cover"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Convert Button and Progress */}
        <div className="p-8 border-t border-gray-200 dark:border-gray-700">
          {progress > 0 && progress < 100 && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300">
                Converting: {progress}%
              </p>
            </div>
          )}

          <button
            onClick={handleConvert}
            disabled={images.length === 0 || isLoading}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-medium text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <FileDown className="w-6 h-6" />
                Convert to PDF
              </>
            )}
          </button>
        </div>

        {/* Alert Dialog */}
        <AlertDialog.Root open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl p-6 w-[90vw] max-w-md shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <AlertDialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                  Alert
                </AlertDialog.Title>
              </div>

              <AlertDialog.Description className="text-gray-600 dark:text-gray-300 mb-6">
                {alertMessage}
              </AlertDialog.Description>

              <div className="flex justify-end">
                <AlertDialog.Action asChild>
                  <button
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    onClick={() => setIsAlertOpen(false)}
                  >
                    OK
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  );
};

export default ImageToPdfConverter;
