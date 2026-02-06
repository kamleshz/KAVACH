import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { API_ENDPOINTS } from '../services/apiEndpoints';

const DocumentViewer = () => {
  const { id, docId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const toAbsUrl = (p) => {
    if (!p) return "";
    if (typeof p !== "string") return "";
    const isAbs = p.startsWith("http://") || p.startsWith("https://");
    return isAbs ? p : `${api.defaults.baseURL}/${p}`;
  };

  const getUrlExt = (url) => {
    if (!url) return "";
    try {
      const u = new URL(url);
      const pathname = u.pathname || "";
      const dot = pathname.lastIndexOf(".");
      return dot >= 0 ? pathname.slice(dot).toLowerCase() : "";
    } catch {
      const clean = String(url).split("?")[0].split("#")[0];
      const dot = clean.lastIndexOf(".");
      return dot >= 0 ? clean.slice(dot).toLowerCase() : "";
    }
  };

  const getLikelyExt = (d, url) => {
    const name = (d?.documentName || "").toString().toLowerCase();
    const fromName = name.match(/\.(pdf|png|jpg|jpeg|gif|bmp|webp)$/i)?.[0] || "";
    if (fromName) return fromName.toLowerCase();
    const fromUrl = getUrlExt(url);
    if (fromUrl) return fromUrl;
    if (url?.includes?.("res.cloudinary.com")) {
      const type = (d?.documentType || "").toString().toLowerCase();
      const looksLikeCertificate = ["gst", "pan", "cin", "factory license", "epr certificate", "iec certificate", "dic/dcssi certificate", "cte", "cto"].some((t) =>
        type.includes(t)
      );
      if (looksLikeCertificate) return ".pdf";
      if (url.includes("/documents/") || url.includes("/verification/")) return ".pdf";
    }
    return "";
  };

  const ensureUrlExt = (url, ext) => {
    if (!url || !ext) return url;
    try {
      const u = new URL(url);
      if (!u.pathname.toLowerCase().endsWith(ext)) {
        u.pathname = `${u.pathname}${ext}`;
      }
      return u.toString();
    } catch {
      const lower = url.toLowerCase();
      if (lower.includes(ext)) return url;
      const hashIndex = url.indexOf("#");
      const queryIndex = url.indexOf("?");
      const cutIndex = [hashIndex, queryIndex].filter((v) => v >= 0).sort((a, b) => a - b)[0];
      if (cutIndex === undefined) return `${url}${ext}`;
      return `${url.slice(0, cutIndex)}${ext}${url.slice(cutIndex)}`;
    }
  };

  const normalizePreviewUrl = (storedUrl) => {
    if (!storedUrl) return "";
    const ext = getLikelyExt(doc, storedUrl);
    return ensureUrlExt(storedUrl, ext);
  };

  useEffect(() => {
    const initialDoc = location.state?.doc;
    if (initialDoc) {
      setDoc(initialDoc);
      setLoading(false);
      return;
    }

    const fetchDoc = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.CLIENT.GET_BY_ID(id));
        if (response.data.success) {
          const client = response.data.data;
          const found = (client.documents || []).find(
            (d) => String(d._id) === String(docId)
          );
          if (found) {
            setDoc(found);
          } else {
            setError("Document not found");
          }
        } else {
          setError(response.data.message || "Failed to load document");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [id, docId, location.state]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Back
        </button>
      </div>
    );
  }

  const storedUrl = toAbsUrl(doc?.filePath || "");
  const previewUrl = normalizePreviewUrl(storedUrl);
  const ext = getLikelyExt(doc, previewUrl);

  const isPdf = ext === ".pdf";
  const isImage = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].includes(ext);

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="group flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-md transition-all hover:bg-primary-600 hover:text-white"
            title="Back"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {doc?.documentType || "Document"}
            </h1>
            <p className="text-sm text-gray-500">
              {doc?.documentName || ""}
            </p>
          </div>
        </div>

        {/* DOWNLOAD */}
        <a
          href={storedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm flex items-center gap-1"
        >
          <i className="fas fa-download text-xs"></i>
          Download
        </a>
      </div>

      {/* PREVIEW */}
      <div className="bg-white rounded-lg shadow-md border h-[80vh] overflow-hidden">
        {isPdf ? (
          <iframe
            src={previewUrl}
            title="PDF Viewer"
            className="w-full h-full"
          />
        ) : isImage ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <img
              src={previewUrl}
              alt={doc?.documentName || "Document"}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <i className="fas fa-file text-4xl mb-3"></i>
            <p>Preview not available.</p>
            <p className="text-sm">Use the Download button above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
