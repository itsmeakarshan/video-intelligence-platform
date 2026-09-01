import { useEffect, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { getQuizAttemptRecommendations } from "../../api/api";

interface WeakTopic {
  topic: string;
  incorrect_count: number;
}

interface YouTubeRecommendation {
  topic: string;
  title: string;
  youtube_video_id: string;
  thumbnail_url: string;
  channel_name: string;
  description: string;
  url: string;
}

interface RecommendationResponse {
  attempt_id: number;
  weak_topics: WeakTopic[];
  recommendations: YouTubeRecommendation[];
  message: string | null;
}

interface Props {
  attemptId: number | null;
}

export default function QuizRecommendations({ attemptId }: Props) {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (attemptId) {
      fetchRecommendations(attemptId);
    }
  }, [attemptId]);

  async function fetchRecommendations(id: number) {
    setLoading(true);
    setError("");
    try {
      const res = await getQuizAttemptRecommendations(id);
      setData(res);
    } catch (err: any) {
      console.error("Unable to load recommendations:", err);
      setError(
        "Recommendations are temporarily unavailable. Your quiz result has still been saved."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!attemptId) return null;

  if (loading) {
    return (
      <div className="mt-8 p-6 rounded-3xl bg-[#25272F] border border-[#333642] shadow-xs text-center flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#E5F842] animate-spin mb-2" />
        <p className="text-xs font-semibold text-slate-400">
          Finding personalized educational videos for your weak areas...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-4 rounded-2xl bg-[#25272F] border border-[#333642] text-slate-300 text-xs font-semibold flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-[#E5F842] shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!data) return null;

  if (data.weak_topics.length === 0) {
    return (
      <div className="mt-8 p-6 rounded-3xl bg-[#25272F] border border-[#333642] shadow-xs flex items-center gap-3 text-white">
        <div className="w-10 h-10 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-[#E5F842]" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">
            Outstanding Performance!
          </h4>
          <p className="text-xs text-slate-400 font-medium">
            {data.message ||
              "Great work! You didn't have any clear weak areas in this quiz."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-[#25272F] border border-[#333642] shadow-xs space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#333642]">
        <div className="w-10 h-10 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center font-bold shrink-0">
          <BookOpen className="w-5 h-5 text-[#E5F842]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
              Recommended Video Lessons
            </h3>
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30">
              AI Targeted
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Educational videos tailored to reinforce concepts you found challenging.
          </p>
        </div>
      </div>

      {/* Concepts to review chips */}
      <div className="p-4 rounded-2xl bg-[#18191E] border border-[#333642] space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          Concepts to Review:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {data.weak_topics.map((item, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 text-xs font-bold rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30"
            >
              {item.topic} ({item.incorrect_count}{" "}
              {item.incorrect_count === 1 ? "missed" : "missed"})
            </span>
          ))}
        </div>
      </div>

      {/* Recommended Videos Grid */}
      {data.recommendations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-[#333642] bg-[#18191E] overflow-hidden hover:border-[#E5F842]/50 hover:shadow-md transition-all group"
            >
              <div className="relative aspect-video bg-black/60 overflow-hidden">
                <img
                  src={rec.thumbnail_url}
                  alt={rec.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2.5 left-2.5 px-2 py-0.8 text-[10px] font-bold rounded-md bg-[#18191E]/90 text-white border border-[#333642] backdrop-blur-xs shadow-xs">
                  {rec.topic}
                </span>
              </div>

              <div className="p-4 flex flex-col justify-between flex-grow space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-2 leading-relaxed">
                    {rec.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 font-medium">
                    {rec.description}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-2">
                    Channel: {rec.channel_name}
                  </p>
                </div>

                <a
                  href={rec.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-[#E5F842]/15 hover:bg-[#E5F842]/25 text-[#E5F842] border border-[#E5F842]/30 font-bold text-xs transition-colors cursor-pointer"
                >
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#E5F842]" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic text-center py-4">
          No matching video recommendations found for these specific topics.
        </p>
      )}
    </div>
  );
}
