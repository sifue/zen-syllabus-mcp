import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


// Create server instance
const server = new McpServer({
  name: "zen-syllabus",
  description: "Zen University Syllabus API",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});


/**
 * 科目
 */
interface Subject {
  code: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  openingYear: string;
  metadata: {
    enrollmentGrade: string;
    teachingMethod: string;
    subjectRequirement: string;
    credit: string;
    quarters: string[];
  }
}

/**
 * APIのレスポンス
 */
interface ApiResponse {
  totalCount: number;
  pageSize: number;
  page: number;
  totalPages: number;
  relatedTags: Array<{ id: number; name: string }>;
  subjects: Subject[];
}

/**
 * fetchAllPages に渡すオプション引数
 */
interface FetchOptions {
  freeword?: string;         // フリーワード検索
  enrollment_grade?: string; // 想定年次
}

/**
 * クエリ付きのURLを生成するヘルパー関数
 */
function createUrl(page: number, options?: FetchOptions): string {
  // 基本のクエリパラメータ
  let url = `https://api.syllabus.zen.ac.jp/search?page=${page}`;

  // フリーワードが指定されていれば追加
  if (options?.freeword) {
    url += `&freeword=${encodeURIComponent(options.freeword)}`;
  }

  // 想定年次が指定されていれば追加
  if (options?.enrollment_grade) {
    url += `&enrollment_grade=${encodeURIComponent(options.enrollment_grade)}`;
  }

  return url;
}

/**
 * 全ページを取得し、subjects を結合して返す関数
 */
async function fetchAllPages(options?: FetchOptions) {
  // まず最初のページを取得
  const firstPageUrl = createUrl(0, options);
  const firstResponse = await fetch(firstPageUrl);
  if (!firstResponse.ok) {
    throw new Error(`APIリクエストに失敗しました: ${firstResponse.status} ${firstResponse.statusText}`);
  }

  const firstData = (await firstResponse.json()) as ApiResponse;
  const allSubjects = [...firstData.subjects];
  const { totalPages, totalCount, pageSize, relatedTags } = firstData;

  // 2ページ目以降を順次取得 (page=1 ~ totalPages-1)
  for (let page = 1; page < totalPages; page++) {
    const url = createUrl(page, options);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`APIリクエストに失敗しました: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ApiResponse;
    allSubjects.push(...data.subjects);
  }

  // 単一のオブジェクトとしてまとめる
  const mergedData = {
    totalCount,
    pageSize,
    totalPages,
    relatedTags,
    subjects: allSubjects,
  };

  return mergedData;
}

// // 実行例: freeword と enrollment_grade を指定しない場合
// (async () => {
//   const mergedDataDefault = await fetchAllPages();
//   console.log('=== No Query Params ===');
//   console.log(JSON.stringify(mergedDataDefault, null, 2));
// })();

// // 実行例: freeword と enrollment_grade を指定した場合
// (async () => {
//   const mergedDataWithQuery = await fetchAllPages({
//     freeword: 'ITリテラシー',
//     enrollment_grade: '1',
//   });
//   console.log('=== With Query Params ===');
//   console.log(JSON.stringify(mergedDataWithQuery, null, 2));
// })();

// Get List of All Subjects tool
server.tool(
  "get-list-of-all-subjects",
  "Retrieve a simplified list of all courses from the ZEN University syllabus, containing only the essential properties (code, name, description, thumbnailUrl, openingYear).",
  {},

  async () => {
    try {
      const result = await fetchAllPages();
      
      // Extract only the required properties from each subject
      const simplifiedSubjects = result.subjects.map(subject => ({
        // code: subject.code,
        name: subject.name,
        description: subject.description,
        // thumbnailUrl: subject.thumbnailUrl,
        openingYear: subject.openingYear,
        metadata: {
          enrollmentGrade: subject.metadata.enrollmentGrade,
          teachingMethod: subject.metadata.teachingMethod,
          subjectRequirement: subject.metadata.subjectRequirement,
          credit: subject.metadata.credit,
          quarters: subject.metadata.quarters
        }

      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(simplifiedSubjects, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error}`,
          },
        ],
      };
    }
  },
);

// Get Subjects tools
server.tool(
  "get-subjects-with-detail",
  "Retrieve the course detail information from the ZEN University syllabus. If neither the numeric expected year of enrollment (enrollment_grade) nor the freeword search parameter (freeword) is specified, all course information will be retrieved.",
  {
    enrollment_grade: z.number().min(1).max(4).describe(" year of enrollment (e.g. 1, 2, 3, 4)"),
    freeword: z.string().describe("the freeword search parameter (e.g. 'ITリテラシー')"),
  },

  async ({ enrollment_grade, freeword }) => {
    try {
      const options: FetchOptions = {};

      if (enrollment_grade) {
        options.enrollment_grade = enrollment_grade.toString();
      }

      if (freeword) {
        options.freeword = freeword;
      }

      const subjects = await fetchAllPages(options);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(subjects, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error}`,
          },
        ],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ZEN University Syllabus MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
