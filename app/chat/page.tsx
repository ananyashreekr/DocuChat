"use client";

import { FilePond } from "react-filepond";
import "filepond/dist/filepond.min.css";
import { useState, useEffect } from "react";
import Lottie from "react-lottie";
import animationUpload from "@/public/lottie/upload-file.json";
import toast, { Toaster } from "react-hot-toast";
import Markdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Upload, Send, Copy, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "@/styles/styles.module.css";
import { HoverInfo } from "@/components/HoverInfo";
import { Audio } from "react-loader-spinner";

// Define the interface for file response
interface FileResponse {
  parsedText: string;
  fileName?: string;
  fileSize?: number;
  textLength?: number;
  numPages?: number;
  error?: string;
}

export default function FileUpload() {
  const [fileResponse, setFileResponse] = useState<FileResponse | null>(null);
  const [prompt, setPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState(""); // Renamed from 'response' to avoid conflicts
  const [output, setOutput] = useState("The response will appear here...");
  const [showHoverInfo, setShowHoverInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const screenColor = "black"; // Removed unused setter

  const uploadOptions = {
    loop: true,
    autoplay: true,
    animationData: animationUpload,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const notify = (status: string, message: string) => {
    toast.dismiss();
    if (status === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error("No file selected!");
      return;
    }
    if (!file.type.includes("text")) {
      toast.error("File type not supported!");
      return;
    }
    
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result;
      setPrompt(typeof result === "string" ? result : "");
    };
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard!");
  };

  const downloadFile = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "chat.txt";
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    toast.success("Downloaded the output as a text file!");
  };

  const showHoverNotification = (message: string) => {
    if (showHoverInfo) {
      toast.dismiss();
      toast(message, { duration: 1000 });
    }
  };

  const onSubmit = async () => {
    if (prompt === "") {
      toast.error("Prompt cannot be empty!");
      return;
    }

    // Check if fileResponse is null
    if (!fileResponse) {
      toast.error("Please upload a file first!");
      return;
    }

    // Check if parsedText exists
    if (!fileResponse.parsedText || fileResponse.parsedText.trim() === "") {
      toast.error("No text found in the uploaded file!");
      return;
    }

    // Clear the output
    setOutput("The response will appear here...");

    setLoading(true);
    toast.loading("Chatting with the AI...");

    const userPrompt = `Answer the question '${prompt}' based on the following text extracted from the provided PDF: ${fileResponse.parsedText}. If you cannot find the data related to the question, please write 'The PDF is your resume highlighting your academic background in AI & ML, technical skills, and project experience.'. If the question is related to summarization, please write a summary of the text.`;

    try {
      // Debug logging
      console.log("fileResponse:", fileResponse);
      console.log("parsedText:", fileResponse.parsedText);
      console.log("userPrompt:", userPrompt);

      const apiResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userPrompt: userPrompt,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error(`HTTP error! status: ${apiResponse.status}`);
      }

      // Get the response from the server
      const data = await apiResponse.json();

      setLoading(false);
      toast.dismiss();

      // Handle both 'text' and 'parsedText' properties from API response
      const responseText = data.text || data.parsedText || '';
      
      if (responseText === "Unable to process the prompt. Please try again.") {
        toast.error("Unable to process the prompt. Please try again.");
        return;
      }

      if (!responseText) {
        toast.error("No response received from AI. Please try again.");
        return;
      }

      // Set the response in the state
      setAiResponse(responseText);
    } catch (error) {
      setLoading(false);
      toast.dismiss();
      toast.error("Failed to process request. Please try again.");
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    // Update the response character by character in the output
    if (aiResponse.length === 0) return;

    setOutput("");

    for (let i = 0; i < aiResponse.length; i++) {
      setTimeout(() => {
        setOutput((prev) => prev + aiResponse[i]);
      }, i * 10);
    }
  }, [aiResponse]);

  return (
    <div>
      <Toaster />
      <div>
        <FilePond
          onaddfile={() => {
            toast.dismiss();
            toast.loading("file processing...");
          }}
          server={{
            process: {
              url: "/api/upload",
              method: "POST",
              withCredentials: false,
              onload: (serverResponse) => {
                console.log("=== FILE UPLOAD DEBUG ===");
                console.log("Raw response from server:", serverResponse);
                
                try {
                  const fileResp: FileResponse = JSON.parse(serverResponse);
                  console.log("Parsed file response:", fileResp);
                  console.log("Response keys:", Object.keys(fileResp));
                  
                  if (fileResp.error) {
                    toast.dismiss();
                    toast.error(`Upload failed: ${fileResp.error}`);
                    console.error("Server returned error:", fileResp);
                    return serverResponse;
                  }
                  
                  toast.dismiss();
                  
                  const hasText = fileResp.parsedText && fileResp.parsedText.trim().length > 0;
                  
                  if (hasText) {
                    toast.success("File processed successfully!");
                  } else {
                    toast.success("File uploaded, but no text extracted. Check console for details.");
                  }
                  
                  setFileResponse(fileResp);
                  return serverResponse;
                } catch (error) {
                  toast.dismiss();
                  toast.error("Failed to parse file response");
                  console.error("Parse error:", error);
                  console.log("Raw response that failed to parse:", serverResponse);
                  return serverResponse;
                }
              },
              onerror: (errorResponse) => {
                toast.dismiss();
                toast.error("file processing failed");
                console.error("File processing error:", errorResponse);
                return errorResponse;
              },
            },
            fetch: null,
            revert: null,
          }}
        />
      </div>
      <div className="relative">
        {fileResponse ? (
          <div>
            <main className={`flex flex-col items-center gap-4`}>
              <HoverInfo
                showHoverInfo={showHoverInfo}
                setShowHoverInfo={setShowHoverInfo}
              />
              <div className="flex gap-2 items-center mt-24">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="prompt"
                    value={prompt}
                    className={cn(
                      "min-w-[320px] sm:min-w-[400px] md:min-w-[500px] h-[50px] pr-12"
                    )}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                    }}
                    onKeyDown={onKeyDown}
                  />
                  <button
                    onClick={onSubmit}
                    className="absolute top-3 right-3 hover:scale-110 transition ease-in-out"
                    onMouseEnter={() =>
                      showHoverNotification("Click to chat with the AI.")
                    }
                  >
                    {loading ? (
                      <Audio color={screenColor} height={25} width={25} />
                    ) : (
                      <Send size="25" />
                    )}
                  </button>
                </div>
                <Input
                  type="file"
                  onChange={onFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className={cn("w-[40px] p-1")}
                  onClick={() => {
                    const fileInput = document.querySelector(
                      "input[type=file]"
                    ) as HTMLInputElement;
                    fileInput?.click();
                  }}
                  onMouseEnter={() =>
                    showHoverNotification(
                      "Upload a text file with the prompt to chat with the AI."
                    )
                  }
                >
                  <Upload className={cn("w-[20px]")} />
                </Button>
              </div>
              <div className="flex gap-3 items-center">
                <Card
                  className={cn(
                    "p-5 whitespace-normal min-w-[320px] sm:w-[500px] md:min-w-[600px] min-h-[150px] max-h-[400px] lg:min-w-[700px] overflow-y-scroll"
                  )}
                >
                  <div className={`${styles.textwrapper}`}>
                    <Markdown
                      className={cn("w-full h-full ")}
                    >{`${output}`}</Markdown>
                  </div>
                </Card>
                <div className="flex flex-col gap-5">
                  <Button
                    variant="outline"
                    className={cn("w-[40px] p-1")}
                    onClick={copyToClipboard}
                    onMouseEnter={() =>
                      showHoverNotification("Copy the output to the clipboard.")
                    }
                  >
                    <Copy className={cn("w-[20px]")} />
                  </Button>
                  <Button
                    variant="outline"
                    className={cn("w-[40px] p-1")}
                    onClick={downloadFile}
                    onMouseEnter={() =>
                      showHoverNotification(
                        "Download the output as a text file."
                      )
                    }
                  >
                    <Download className={cn("w-[20px]")} />
                  </Button>
                </div>
              </div>
            </main>
          </div>
        ) : (
          <div className="flex flex-col gap-2 justify-center items-center">
            <h2 className="font-bold mt-10">Upload a file to chat</h2>
            <p>Supported file types: PDF</p>
            <div
              className="h-[260px] w-[260px]"
              onClick={() => notify("success", "upload a pdf")}
            >
              <Lottie options={uploadOptions} height={260} width={260} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}