"use client";

import { useState } from "react";
import { useCreatePollMutation } from "@/src/redux/feature/chatApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Plus, Trash2, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreatePollModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
}

export default function CreatePollModal({ open, onClose, chatId }: CreatePollModalProps) {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [hasExpiry, setExpiryEnabled] = useState(false);
  const [endsAt, setEndsAt] = useState("");

  const [createPoll, { isLoading }] = useCreatePollMutation();

  const handleAddOption = () => {
    if (options.length >= 10) {
      toast.warning("Tối đa chỉ được có 10 phương án bình chọn!");
      return;
    }
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      toast.warning("Bình chọn phải có ít nhất 2 phương án!");
      return;
    }
    setOptions(options.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (value: string, index: number) => {
    const updatedOptions = [...options];
    updatedOptions[index] = value;

    // Frictionless Auto-Append: Create (N+1)-th option input dynamically when typing in the current last option
    if (index === options.length - 1 && value.trim() !== "" && options.length < 10) {
      updatedOptions.push("");
    }

    setOptions(updatedOptions);
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent default form submit

      // Move focus to next input if available
      if (index < options.length - 1) {
        const nextInput = document.getElementById(`poll-option-${index + 1}`) as HTMLInputElement;
        nextInput?.focus();
      } else if (options.length === 10) {
        // If hard limit 10 reached, submit the form directly
        handleSubmit(e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề cuộc khảo sát!");
      return;
    }

    // Dynamic Data Cleansing: Remove empty, trimmed option entries
    const cleanOptions = options.map((opt) => opt.trim()).filter((opt) => opt.length > 0);
    if (cleanOptions.length < 2) {
      toast.error("Vui lòng điền đầy đủ ít nhất 2 phương án bình chọn!");
      return;
    }

    let endsAtISO: string | undefined = undefined;
    if (hasExpiry) {
      if (!endsAt) {
        toast.error("Vui lòng chọn thời gian kết thúc!");
        return;
      }
      const selectedDate = new Date(endsAt);
      if (selectedDate <= new Date()) {
        toast.error("Thời gian kết thúc phải lớn hơn thời gian hiện tại!");
        return;
      }
      endsAtISO = selectedDate.toISOString();
    }

    try {
      await createPoll({
        chatId,
        title: title.trim(),
        options: cleanOptions,
        endsAt: endsAtISO,
      }).unwrap();
      toast.success("Tạo cuộc bình chọn thành công!");
      handleClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi khi tạo khảo sát!");
    }
  };

  const handleClose = () => {
    setTitle("");
    setOptions(["", ""]);
    setExpiryEnabled(false);
    setEndsAt("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-sm border border-border bg-background p-6 shadow-2xl [&>button]:rounded-sm">
        <DialogHeader className="flex flex-row items-center gap-3 border-b pb-4 border-border dark:border-white/[0.04]">
          <div className="w-8 h-8 rounded-sm bg-blue-500/10 flex items-center justify-center text-primary">
            <BarChart3 size={15} />
          </div>
          <div className="text-left">
            <DialogTitle className="text-sm font-semibold uppercase font-mono tracking-wider text-foreground dark:text-foreground">
              Tạo cuộc khảo sát mới
            </DialogTitle>
            <p className="text-[10px] font-mono text-muted-foreground dark:text-muted-foreground mt-1">
              Thu thập ý kiến nhanh chóng từ các thành viên.
            </p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Poll Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground mb-1 block font-mono">
              Câu hỏi khảo sát <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Nhập câu hỏi hoặc chủ đề bình chọn..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-muted dark:bg-muted/40 border border-border rounded-sm text-xs h-9 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-500 font-mono transition-colors text-slate-850 dark:text-slate-150"
              maxLength={150}
              required
            />
          </div>

          {/* Dynamic Options List */}
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground flex items-center justify-between font-mono">
              <span>Các phương án lựa chọn <span className="text-red-500">*</span></span>
              <span className="text-[10px] font-normal lowercase">
                ({options.filter(o => o.trim().length > 0).length}/10 phương án)
              </span>
            </Label>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground w-4 text-center font-mono">
                    {index + 1}
                  </span>
                  <Input
                    id={`poll-option-${index}`}
                    placeholder={`Nhập phương án ${index + 1}...`}
                    value={option}
                    onChange={(e) => handleOptionChange(e.target.value, index)}
                    onKeyDown={(e) => handleOptionKeyDown(e, index)}
                    className="bg-muted dark:bg-muted/40 border border-border rounded-sm text-xs h-8 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-500 font-mono transition-colors text-slate-850 dark:text-slate-150 flex-1"
                    maxLength={100}
                    required={index < 2} // ONLY require the first 2 options to avoid HTML5 validation blocks
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-sm flex-shrink-0 border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddOption}
                className="h-8 w-full border border-dashed border-border text-xs font-mono font-medium text-primary hover:text-blue-700 hover:bg-blue-50/30 dark:hover:bg-muted/10 rounded-sm mt-1 flex items-center justify-center gap-1 transition-all"
              >
                <Plus size={13} />
                Thêm phương án
              </Button>
            )}
          </div>

          {/* Optional Expiry Picker */}
          <div className="flex flex-col gap-2.5 bg-muted/50 dark:bg-zinc-950/30 p-3 rounded-sm border border-border">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasExpiry}
                onChange={(e) => setExpiryEnabled(e.target.checked)}
                className="rounded-sm border-border dark:border-border text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground font-mono flex items-center gap-1.5">
                <Calendar size={13} className="text-muted-foreground dark:text-muted-foreground" />
                Thiết lập thời hạn kết thúc
              </span>
            </label>

            {hasExpiry && (
              <div className="flex flex-col gap-1.5 pl-5.5 animate-fadeIn">
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="bg-muted dark:bg-muted/40 border border-border rounded-sm text-xs h-8 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-500 font-mono transition-colors text-slate-850 dark:text-slate-150"
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  required={hasExpiry}
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 justify-end border-t pt-4 border-border dark:border-white/[0.04]">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-9 text-xs font-mono font-medium px-4 rounded-sm border border-border hover:bg-muted dark:hover:bg-muted/10 uppercase tracking-wider transition-colors"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 dark:bg-primary/90 dark:hover:bg-primary text-white h-9 text-xs font-mono font-medium px-4 rounded-sm uppercase tracking-wider transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <Loader2 size={13} className="animate-spin" />
                  Đang tạo...
                </span>
              ) : (
                "Tạo khảo sát"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
