import { useState } from 'react';

const PDFViewer = ({ url }) => {
    const [zoom, setZoom] = useState(100);
    const [error, setError] = useState(false);

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 25, 200));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 25, 50));
    };

    const handleZoomReset = () => {
        setZoom(100);
    };

    const handleIframeError = () => {
        setError(true);
    };

    if (error) {
        return (
            <div className="pdf-viewer error">
                <div className="error-content">
                    <h4>PDF Preview Not Available</h4>
                    <p>Unable to display PDF in browser. Please download the file to view it.</p>
                    <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                    >
                        📥 Download PDF
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="pdf-viewer">
            <div className="pdf-controls">
                <div className="zoom-controls">
                    <button 
                        className="btn btn-sm"
                        onClick={handleZoomOut}
                        disabled={zoom <= 50}
                    >
                        −
                    </button>
                    <span className="zoom-level">{zoom}%</span>
                    <button 
                        className="btn btn-sm"
                        onClick={handleZoomIn}
                        disabled={zoom >= 200}
                    >
                        +
                    </button>
                    <button 
                        className="btn btn-sm"
                        onClick={handleZoomReset}
                    >
                        Reset
                    </button>
                </div>
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline"
                >
                    📥 Download
                </a>
            </div>
            <div className="pdf-content">
                <iframe
                    src={`${url}#toolbar=0&navpanes=0&scrollbar=1&zoom=${zoom}`}
                    width="100%"
                    height="100%"
                    title="PDF Viewer"
                    onError={handleIframeError}
                    style={{
                        border: 'none',
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top left'
                    }}
                />
            </div>
        </div>
    );
};

export default PDFViewer;