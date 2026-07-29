"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload } from "lucide-react";

type Extracted = {
  skills: string[];
  roles: string[];
  education: string[];
  yearsOfExperience: number;
};

export function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extracted | null>(null);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resume/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResult(data.extracted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>Upload your resume</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        <Button onClick={handleUpload} disabled={!file || loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" /> Upload & analyze
            </>
          )}
        </Button>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {result && (
          <div className="space-y-3 pt-2">
            <div>
              <p className="text-sm font-medium mb-1">Skills</p>
              <div className="flex flex-wrap gap-2">
                {result.skills.length ? (
                  result.skills.map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None detected</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Roles</p>
              <p className="text-sm text-muted-foreground">{result.roles.join(", ") || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Experience</p>
              <p className="text-sm text-muted-foreground">{result.yearsOfExperience} year(s)</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
