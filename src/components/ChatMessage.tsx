import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChartRenderer, ChartData } from './ChartRenderer';
import { ImageGallery } from './ImageGallery';
import { isImageUrl, convertGoogleDriveUrl } from '../utils/imageUtils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  charts?: ChartData[];
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, timestamp, charts = [] }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Clean HTML tags and convert common HTML to markdown
  const cleanHtmlToMarkdown = (text: string): string => {
    return text
      // Convert <br> and <br/> to newlines
      .replace(/<br\s*\/?>/gi, '\n\n')
      // Remove other HTML tags but keep content
      .replace(/<[^>]+>/g, '')
      // Clean up excessive newlines
      .replace(/\n{3,}/g, '\n\n');
  };

  // Extract chart data from JSON code blocks and create placeholders for inline rendering
  const processChartsInContent = (text: string): { processedContent: string; chartMap: Map<string, ChartData> } => {
    // First clean HTML tags
    const cleanedText = cleanHtmlToMarkdown(text);
    const chartRegex = /```json\s*([\s\S]*?)\s*```/gi;
    const matches = Array.from(text.matchAll(chartRegex));
    const chartMap = new Map<string, ChartData>();
    let processedContent = cleanedText;
    let chartIndex = 0;

    matches.forEach((match) => {
      try {
        const jsonStr = match[1];
        const parsed = JSON.parse(jsonStr);
        
        // Check if this is a chart specification (has type: "chart" or chartType)
        if ((parsed.type === 'chart' || parsed.chartType) && parsed.data && parsed.title) {
          // Extract the actual chart data
          const chartData: ChartData = {
            type: parsed.chartType || parsed.type?.replace('chart', '') || 'bar',
            chartType: parsed.chartType || parsed.type?.replace('chart', '') || 'bar',
            title: parsed.title,
            data: parsed.data,
            xKey: parsed.xKey,
            yKeys: parsed.yKeys,
            colors: parsed.colors,
            xAxisLabel: parsed.xAxisLabel,
            yAxisLabel: parsed.yAxisLabel,
          };
          
          // Create a unique placeholder
          const placeholder = `__CHART_PLACEHOLDER_${chartIndex}__`;
          chartMap.set(placeholder, chartData);
          
          // Replace the JSON block with placeholder
          processedContent = processedContent.replace(match[0], placeholder);
          chartIndex++;
        }
      } catch (e) {
        // Not a chart JSON, keep it in the content
        console.log('Not a chart JSON or parse error:', e);
      }
    });

    return { processedContent, chartMap };
  };

  const { processedContent, chartMap } = processChartsInContent(content);
  
  // Split content by chart placeholders to render charts inline
  const renderContentWithCharts = () => {
    const parts = processedContent.split(/(__CHART_PLACEHOLDER_\d+__)/);
    const elements: React.ReactNode[] = [];
    
    parts.forEach((part, index) => {
      if (part.startsWith('__CHART_PLACEHOLDER_') && chartMap.has(part)) {
        // Render chart inline
        const chartData = chartMap.get(part)!;
        elements.push(
          <ChartRenderer key={`chart-${index}`} chartData={chartData} />
        );
      } else if (part.trim()) {
        // Render markdown content
        elements.push(
          <div key={`content-${index}`} className="prose prose-base max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }: any) => (
                  <h1 className="text-3xl font-bold text-gray-900 mt-6 mb-4 border-b border-gray-200 pb-2" {...props} />
                ),
                h2: ({ node, ...props }: any) => (
                  <h2 className="text-2xl font-bold text-gray-900 mt-5 mb-3 border-b border-gray-200 pb-2" {...props} />
                ),
                h3: ({ node, ...props }: any) => (
                  <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2" {...props} />
                ),
                h4: ({ node, ...props }: any) => (
                  <h4 className="text-lg font-semibold text-gray-800 mt-3 mb-2" {...props} />
                ),
                h5: ({ node, ...props }: any) => (
                  <h5 className="text-base font-semibold text-gray-700 mt-3 mb-2" {...props} />
                ),
                h6: ({ node, ...props }: any) => (
                  <h6 className="text-sm font-semibold text-gray-700 mt-2 mb-1" {...props} />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead className="bg-gray-50" {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="px-4 py-2 text-sm text-gray-900 border-b" {...props} />
                ),
                code: ({ node, inline, ...props }: any) => {
                  if (inline) {
                    return (
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                    );
                  }
                  return (
                    <code className="block bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto" {...props} />
                  );
                },
                pre: ({ node, ...props }) => (
                  <pre className="bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto my-2" {...props} />
                ),
                p: ({ node, ...props }: any) => (
                  <p className="mb-3 leading-relaxed text-base whitespace-pre-wrap break-words" {...props} />
                ),
                // Convert <br> tags to line breaks
                br: ({ node, ...props }: any) => <br {...props} />,
              }}
            >
              {part}
            </ReactMarkdown>
          </div>
        );
      }
    });
    
    return elements;
  };

  // Extract image URLs from markdown content
  const extractImageUrls = (text: string): string[] => {
    const imageUrls: string[] = [];
    
    // Match markdown image syntax: ![alt](url)
    const markdownImageRegex = /!\[.*?\]\((.*?)\)/g;
    let match;
    while ((match = markdownImageRegex.exec(text)) !== null) {
      const url = match[1];
      if (isImageUrl(url)) {
        imageUrls.push(url);
      } else {
        const converted = convertGoogleDriveUrl(url);
        if (converted) imageUrls.push(converted);
      }
    }
    
    // Match plain URLs in text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[1];
      if (isImageUrl(url)) {
        imageUrls.push(url);
      } else {
        const converted = convertGoogleDriveUrl(url);
        if (converted) imageUrls.push(converted);
      }
    }
    
    return imageUrls;
  };

  const imageUrls = extractImageUrls(processedContent);

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[90%] rounded-lg p-5 ${
          role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
        }`}
      >
        {role === 'assistant' && (
          <div>
            {renderContentWithCharts()}
          </div>
        )}
        
        {role === 'user' && (
          <div className="whitespace-pre-wrap text-sm">{content}</div>
        )}

        {/* Render images */}
        {imageUrls.length > 0 && (
          <ImageGallery images={imageUrls} />
        )}

        <div
          className={`text-xs mt-2 ${
            role === 'user' ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
};

