import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const BarcodeScanner = ({ onScanSuccess, onClose, isOpen }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const isInitializing = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Add small delay to ensure dialog is rendered
      const timer = setTimeout(() => {
        initializeScanner();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    if (isInitializing.current) return;
    isInitializing.current = true;

    try {
      // Ensure any existing scanner is completely cleaned up
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (e) {
          console.log('Cleanup error (safe to ignore):', e);
        }
        scannerRef.current = null;
      }

      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Use rear camera if available (usually better for barcode scanning)
        const rearCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0];
        await startScanning(rearCamera.id);
      } else {
        toast.error('No cameras found on this device');
      }
    } catch (error) {
      console.error('Error initializing scanner:', error);
      toast.error('Failed to access camera. Please check permissions.');
    } finally {
      isInitializing.current = false;
    }
  };

  const startScanning = async (cameraId: string) => {
    try {
      // Create fresh scanner instance
      scannerRef.current = new Html5Qrcode('barcode-reader');

      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          onScanSuccess(decodedText);
          stopScanning();
          onClose();
          toast.success('Barcode scanned successfully!');
        },
        (errorMessage) => {
          // Scanning errors are normal, don't show them
        }
      );

      setIsScanning(true);
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      const errorMsg = error?.message || 'Failed to start camera';
      toast.error(errorMsg);
      scannerRef.current = null;
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      }
    } catch (error) {
      console.error('Error stopping scanner:', error);
      // Force cleanup even if stop fails
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            id="barcode-reader"
            className="w-full aspect-square bg-muted rounded-lg overflow-hidden"
          />

          <div className="text-sm text-muted-foreground text-center">
            Position the barcode within the scanning area
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
