const encoder = new TextEncoder();

function splitIntoChunks(text: string): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > 22) {
      if (current) {
        chunks.push(current);
      }

      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function createTextStreamResponse(text: string): Response {
  const chunks = splitIntoChunks(text);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let index = 0;

      const pushChunk = () => {
        if (index >= chunks.length) {
          controller.close();
          return;
        }

        const chunk = index === 0 ? chunks[index] : ` ${chunks[index]}`;
        controller.enqueue(encoder.encode(chunk));
        index += 1;

        setTimeout(pushChunk, 18);
      };

      pushChunk();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
