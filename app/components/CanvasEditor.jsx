"use client"
import React, { useRef, useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function CanvasEditor() {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [command, setCommand] = useState("");
  const [blurValue, setBlurValue] = useState(0);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bgLoading, setBgLoading] = useState(false);
  const [prompting,setprompting]=useState(false)

  // --- Draw Image to Canvas ---
  const drawImageToCanvas = (img) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const aspectRatio = img.width / img.height;
    let newWidth = canvas.width;
    let newHeight = newWidth / aspectRatio;
    if (newHeight > canvas.height) {
      newHeight = canvas.height;
      newWidth = newHeight * aspectRatio;
    }

    const xOffset = (canvas.width - newWidth) / 2;
    const yOffset = (canvas.height - newHeight) / 2;

    ctx.drawImage(img, xOffset, yOffset, newWidth, newHeight);
  };

  // --- Blur Function ---
  const applyBlur = () => {
    if (!image || !window.cv) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    let src = cv.imread(canvas);
    let dst = new cv.Mat();
    let ksize = blurValue % 2 === 0 ? blurValue + 1 : blurValue;
    if (ksize < 1) ksize = 1;

    const k = new cv.Size(ksize, ksize);
    cv.GaussianBlur(src, dst, k, 0, 0, cv.BORDER_DEFAULT);
    cv.imshow(canvas, dst);
    src.delete();
    dst.delete();
  };

  //  Improved Background Removal with resize & compress ---
  const removeBackground = async () => {
    if (!image) {
      toast.error("Please upload an image first!");
      return;
    }

    setBgLoading(true);

    try {
      // Resize & compress before sending to backend
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let newWidth = image.width;
      let newHeight = image.height;

      if (newWidth > MAX_WIDTH || newHeight > MAX_HEIGHT) {
        const aspectRatio = newWidth / newHeight;
        if (aspectRatio > 1) {
          newWidth = MAX_WIDTH;
          newHeight = Math.floor(MAX_WIDTH / aspectRatio);
        } else {
          newHeight = MAX_HEIGHT;
          newWidth = Math.floor(MAX_HEIGHT * aspectRatio);
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, newWidth, newHeight);

      //  Compress image (JPEG 80%)
      const imageBase64 = canvas
        .toDataURL("image/jpeg", 0.8)
        .replace(/^data:image\/jpeg;base64,/, "");

      //  Call backend API
      const res = await fetch("/api/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("HF API error:", err);
        toast.error("Background removal failed!");
        return;
      }

      const { result } = await res.json();

      // Show returned image on canvas
      const bgRemovedImg = new Image();
      bgRemovedImg.src = "data:image/png;base64," + result;
      bgRemovedImg.onload = () => {
        const canvasRefCurrent = canvasRef.current;
        canvasRefCurrent.width = bgRemovedImg.width;
        canvasRefCurrent.height = bgRemovedImg.height;
        const ctx2 = canvasRefCurrent.getContext("2d");
        ctx2.clearRect(0, 0, canvasRefCurrent.width, canvasRefCurrent.height);
        ctx2.drawImage(bgRemovedImg, 0, 0);
        setBgRemoved(true);
        toast.success("Background removed successfully!");
      };
    } catch (err) {
      console.error("Background removal failed:", err);
      toast.error("Background removal failed!");
    } finally {
      setBgLoading(false);
    }
  };

  // --- Execute Command ---
 const executeCommandAI = async (commandText) => {
  setprompting(true)
  if (!commandText.trim()) return toast.error("Please enter a command!");
  try {
    // Vercel deployment ke liye relative URL
    const res = await fetch("/api/execute-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: commandText }),
    });

    if (!res.ok) return toast.error("Command execution failed!");
    const actionJSON = await res.json();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (actionJSON.action === "draw_circle") {
      ctx.beginPath();
      ctx.arc(actionJSON.x || 100, actionJSON.y || 100, actionJSON.radius || 50, 0, 2 * Math.PI);
      ctx.fillStyle = actionJSON.color || "red";
      ctx.fill();
      ctx.closePath();
    } else if (actionJSON.action === "adjust_brightness") {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      const percent = actionJSON.percent || 20;
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.min(255, pixels[i] + (pixels[i] * percent) / 100);
        pixels[i + 1] = Math.min(255, pixels[i + 1] + (pixels[i + 1] * percent) / 100);
        pixels[i + 2] = Math.min(255, pixels[i + 2] + (pixels[i + 2] * percent) / 100);
      }
      ctx.putImageData(imgData, 0, 0);
    } else {
      toast.error("Unknown action: " + actionJSON.action);
    }

    toast.success("Command executed!");
    setprompting(false)
  } catch (err) {
    console.error(err);
    toast.error("Command execution failed!");
  }
};


  // --- File Upload ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    //  Optional: Size check before loading
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large! Please choose an image below 5MB.");
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImage(img);
      setBgRemoved(false);
      drawImageToCanvas(img);
    };
    img.src = URL.createObjectURL(file);
  };

  // - Drag & Drop ---
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large! Please choose an image below 5MB.");
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImage(img);
      setBgRemoved(false);
      drawImageToCanvas(img);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  useEffect(() => {
    if (image) applyBlur();
  }, [blurValue, image]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <Toaster position="top-right" />
      <h2>📤 Upload or Drag & Drop an Image</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          margin: "20px auto",
          width: "820px",
          height: "620px",
          border: "2px dashed #999",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
        }}
      >
        <canvas ref={canvasRef} width={800} height={600}></canvas>
      </div>

      <div style={{ marginTop: "20px" }}>
        <label>
          Gaussian Blur: {blurValue}
          <input
            type="range"
            min="0"
            max="25"
            value={blurValue}
            onChange={(e) => setBlurValue(parseInt(e.target.value))}
            style={{ width: "300px", marginLeft: "10px" }}
          />
        </label>
      </div>

      <div style={{ marginTop: "20px" }}>
        <input
          type="text"
          placeholder="Type command (eg: draw red circle, brighten 20%)"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          style={{ width: "300px", padding: "5px" }}
        />
        <button
          onClick={() => executeCommandAI(command)}
          style={{ marginLeft: "10px" }}
        >
           {prompting ? "Processing..." : "🗑️ Execute command"}
        </button>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={removeBackground}
          disabled={!image || bgRemoved || bgLoading}
        >
          {bgLoading ? "Processing..." : "🗑️ Remove Background"}
        </button>
        {bgRemoved && <span style={{ marginLeft: "10px" }}>✅ Done</span>}
      </div>
    </div>
  );
}
