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

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        startScanning(devices[0].id);
      } else {
        toast.error('No cameras found on this device');
      }
    } catch (error) {
      console.error('Error initializing scanner:', error);
      toast.error('Failed to access camera');
    }
  };

  const startScanning = async (cameraId: string) => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('barcode-reader');
      }

      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
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
    } catch (error) {
      console.error('Error starting scanner:', error);
      toast.error('Failed to start camera');
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setIsScanning(false);
      }
    } catch (error) {
      console.error('Error stopping scanner:', error);
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
