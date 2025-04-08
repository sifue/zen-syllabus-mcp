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
 * クエリ付きのURLを生成するヘルパー関数
 */
function createUrl(page, options) {
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
async function fetchAllPages(options) {
    // まず最初のページを取得
    const firstPageUrl = createUrl(0, options);
    const firstResponse = await fetch(firstPageUrl);
    if (!firstResponse.ok) {
        throw new Error(`APIリクエストに失敗しました: ${firstResponse.status} ${firstResponse.statusText}`);
    }
    const firstData = (await firstResponse.json());
    const allSubjects = [...firstData.subjects];
    const { totalPages, totalCount, pageSize, relatedTags } = firstData;
    // 2ページ目以降を順次取得 (page=1 ~ totalPages-1)
    for (let page = 1; page < totalPages; page++) {
        const url = createUrl(page, options);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`APIリクエストに失敗しました: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json());
        allSubjects.push(...data.subjects);
    }
    // 単一のオブジェクトとしてまとめる
    const mergedData = {
        totalCount,
        pageSize,
        page: 0, // 全ページのデータを結合した結果なので、page=0 とする
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
/**
 * 簡易的な科目情報をテキスト形式に変換する関数
 */
function formatSimplifiedSubjectToText(subject) {
    // 科目の基本情報
    let text = `# 科目: ${subject.name}\n`;
    text += `開講年度: ${subject.openingYear}年\n\n`;
    // 科目情報
    text += `## 科目情報\n`;
    text += `- 想定年次: ${subject.metadata.enrollmentGrade}\n`;
    text += `- 授業形態: ${subject.metadata.teachingMethod}\n`;
    text += `- 必修/選択: ${subject.metadata.subjectRequirement}\n`;
    text += `- 単位数: ${subject.metadata.credit}\n`;
    if (subject.metadata.quarters && subject.metadata.quarters.length > 0) {
        text += `- 開講時期: ${subject.metadata.quarters.join(', ')}\n`;
    }
    return text;
}
/**
 * 複数の簡易的な科目情報をテキスト形式に変換する関数
 */
function formatSimplifiedSubjectsToText(subjects) {
    let text = `検索結果: ${subjects.length}件の科目が見つかりました\n\n`;
    subjects.forEach((subject, index) => {
        text += formatSimplifiedSubjectToText(subject);
        // 最後の科目でなければ区切り線を追加
        if (index < subjects.length - 1) {
            text += `\n${'='.repeat(30)}\n\n`;
        }
    });
    return text;
}
// Get List of All Subjects tool
server.tool("get-list-of-all-subjects", "Retrieve a simplified list of all courses from the ZEN University syllabus, containing only the essential properties (name, openingYear, enrollmentGrade, teachingMethod, subjectRequirement, quarters).", {}, async () => {
    try {
        const result = await fetchAllPages();
        // Extract only the required properties from each subject
        const simplifiedSubjects = result.subjects.map(subject => ({
            // code: subject.code,
            name: subject.name,
            // description: subject.description,
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
        // テキスト形式に変換
        const formattedText = formatSimplifiedSubjectsToText(simplifiedSubjects);
        return {
            content: [
                {
                    type: "text",
                    text: formattedText,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error}`,
                },
            ],
        };
    }
});
/**
 * 科目情報をLLMが解釈しやすいテキスト形式に変換する関数
 */
function formatSubjectToText(subject) {
    // 科目の基本情報
    let text = `# 科目: ${subject.name} (${subject.code})\n`;
    text += `開講年度: ${subject.openingYear}年\n`;
    text += `説明: ${subject.description}\n\n`;
    // 教員情報
    if (subject.faculty && subject.faculty.length > 0) {
        text += `## 教員情報\n`;
        subject.faculty.forEach(faculty => {
            text += `- ${faculty.name} (${faculty.title})\n`;
        });
        text += `\n`;
    }
    // 科目情報
    text += `## 科目情報\n`;
    text += `- 想定年次: ${subject.metadata.enrollmentGrade}\n`;
    text += `- 授業形態: ${subject.metadata.teachingMethod}\n`;
    text += `- 必修/選択: ${subject.metadata.subjectRequirement}\n`;
    text += `- 単位数: ${subject.metadata.credit}\n`;
    if (subject.metadata.quarters && subject.metadata.quarters.length > 0) {
        text += `- 開講時期: ${subject.metadata.quarters.join(', ')}\n`;
    }
    text += `\n`;
    // 授業の目的
    if (subject.metadata.objective) {
        text += `## 授業の目的\n${subject.metadata.objective}\n\n`;
    }
    // 授業計画
    if (subject.metadata.coursePlans && subject.metadata.coursePlans.length > 0) {
        text += `## 授業計画\n`;
        subject.metadata.coursePlans.forEach((plan, index) => {
            text += `${index + 1}. ${plan.title}: ${plan.description}\n`;
        });
    }
    return text;
}
/**
 * 複数の科目情報をテキスト形式に変換する関数
 */
function formatSubjectsToText(apiResponse) {
    let text = `検索結果: ${apiResponse.totalCount}件の科目が見つかりました\n\n`;
    apiResponse.subjects.forEach((subject, index) => {
        text += formatSubjectToText(subject);
        // 最後の科目でなければ区切り線を追加
        if (index < apiResponse.subjects.length - 1) {
            text += `\n${'='.repeat(50)}\n\n`;
        }
    });
    return text;
}
// Get Subjects with details tools
server.tool("get-subjects-with-detail", "Retrieve detailed course information from the ZEN University syllabus. The numeric intended year of enrollment (enrollment_grade) and the freeword parameter (freeword) must be specified. The freeword parameter is intended for searching course names and similar keywords.", {
    enrollment_grade: z.number().min(1).max(4).describe(" year of enrollment (e.g. 1, 2, 3, 4)"),
    freeword: z.string().describe("the freeword search parameter (e.g. 'ITリテラシー')"),
}, async ({ enrollment_grade, freeword }) => {
    try {
        const options = {};
        if (enrollment_grade) {
            options.enrollment_grade = enrollment_grade.toString();
        }
        if (freeword) {
            options.freeword = freeword;
        }
        const apiResponse = await fetchAllPages(options);
        // 必要なフィールドのみを抽出
        const filteredSubjects = apiResponse.subjects.map(subject => ({
            code: subject.code,
            name: subject.name,
            description: subject.description,
            thumbnailUrl: subject.thumbnailUrl,
            openingYear: subject.openingYear,
            faculty: subject.faculty ? subject.faculty.map(f => ({
                id: f.id,
                name: f.name,
                reading: f.reading,
                isForeign: f.isForeign,
                title: f.title,
                expertise: f.expertise,
                avatarUrl: f.avatarUrl
            })) : [],
            metadata: {
                enrollmentGrade: subject.metadata.enrollmentGrade,
                teachingMethod: subject.metadata.teachingMethod,
                subjectRequirement: subject.metadata.subjectRequirement,
                credit: subject.metadata.credit,
                quarters: subject.metadata.quarters,
                objective: subject.metadata.objective,
                coursePlans: subject.metadata.coursePlans ? subject.metadata.coursePlans.map(plan => ({
                    title: plan.title,
                    description: plan.description,
                    sections: plan.sections
                })) : []
            }
        }));
        // フィルタリングした結果を新しいレスポンスオブジェクトに設定
        const filteredResponse = {
            totalCount: apiResponse.totalCount,
            pageSize: apiResponse.pageSize,
            page: apiResponse.page,
            totalPages: apiResponse.totalPages,
            relatedTags: apiResponse.relatedTags,
            subjects: filteredSubjects
        };
        // テキスト形式に変換
        const formattedText = formatSubjectsToText(filteredResponse);
        return {
            content: [
                {
                    type: "text",
                    text: formattedText,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error}`,
                },
            ],
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("ZEN University Syllabus MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
