import { EmployeeDocumentBrowser } from "@/src/features/employee";

export const metadata = {
  title: "Tài liệu nội bộ | OTT Chat",
  description: "Duyệt và tải các tài liệu nội bộ của công ty theo phòng ban và thư mục.",
};

export default function DocumentsPage() {
  return (
    <div className="w-full p-4 md:p-8">
      <EmployeeDocumentBrowser />
    </div>
  );
}
