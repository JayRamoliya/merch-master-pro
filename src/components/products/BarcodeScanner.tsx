import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

const BarcodeScanner = ({ isOpen, onClose, onScanSuccess }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const isInitializing = useRef(false);

  useEffect(() => {
    if (isOpen) {
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
      scannerRef.current = new Html5Qrcode('product-barcode-reader');

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
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div id="product-barcode-reader" className="w-full rounded-lg overflow-hidden" />
          {isScanning && (
            <div className="text-center text-sm text-muted-foreground">
              Position the barcode within the frame
            </div>
          )}
          <Button onClick={onClose} variant="outline" className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
