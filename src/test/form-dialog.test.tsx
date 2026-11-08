import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { FormDialog } from "@/components/admin/FormDialog";

describe("FormDialog component resilience and callback compatibility", () => {
  it("calls onSubmit when onSubmit prop is provided", async () => {
    const onSubmit = vi.fn().mockReturnValue(true);
    const onOpenChange = vi.fn();

    render(
      <FormDialog
        open={true}
        onOpenChange={onOpenChange}
        title="ทดสอบฟอร์ม"
        submitLabel="บันทึก"
        onSubmit={onSubmit}
      >
        <div>เนื้อหาฟอร์ม</div>
      </FormDialog>
    );

    const submitBtn = screen.getByRole("button", { name: "บันทึก" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("calls onConfirm when onConfirm prop is provided instead of onSubmit without throwing TypeError", async () => {
    const onConfirm = vi.fn().mockReturnValue(true);
    const onOpenChange = vi.fn();

    render(
      <FormDialog
        open={true}
        onOpenChange={onOpenChange}
        title="ทดสอบ onConfirm"
        confirmLabel="ยืนยันการออก PO"
        onConfirm={onConfirm}
      >
        <div>เนื้อหาฟอร์ม PO</div>
      </FormDialog>
    );

    const confirmBtn = screen.getByRole("button", { name: "ยืนยันการออก PO" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("calls onSave when onSave prop is provided without throwing TypeError", async () => {
    const onSave = vi.fn().mockReturnValue(true);
    const onOpenChange = vi.fn();

    render(
      <FormDialog
        open={true}
        onOpenChange={onOpenChange}
        title="ทดสอบ onSave"
        submitLabel="บันทึกข้อมูล"
        onSave={onSave}
      >
        <div>เนื้อหาฟอร์ม</div>
      </FormDialog>
    );

    const saveBtn = screen.getByRole("button", { name: "บันทึกข้อมูล" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("does not close dialog if callback returns false (e.g. validation error)", async () => {
    const onSubmit = vi.fn().mockReturnValue(false);
    const onOpenChange = vi.fn();

    render(
      <FormDialog
        open={true}
        onOpenChange={onOpenChange}
        title="ทดสอบ Validation Failed"
        onSubmit={onSubmit}
      >
        <div>เนื้อหาฟอร์ม</div>
      </FormDialog>
    );

    const submitBtn = screen.getByRole("button", { name: "บันทึก" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  it("does not throw if no submission handler is provided, and gracefully closes", async () => {
    const onOpenChange = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <FormDialog
        open={true}
        onOpenChange={onOpenChange}
        title="ทดสอบ ไม่มี handler"
      >
        <div>เนื้อหาฟอร์ม</div>
      </FormDialog>
    );

    const submitBtn = screen.getByRole("button", { name: "บันทึก" });
    expect(() => fireEvent.click(submitBtn)).not.toThrow();

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith("FormDialog: No submit function provided, closing dialog.");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    warnSpy.mockRestore();
  });

  it("catches errors inside submit handler gracefully without crashing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onOpenChange = vi.fn();
    const badSubmit = vi.fn().mockImplementation(() => {
      throw new Error("Simulated failure in handler");
    });

    render(
      <FormDialog
        open={true}
        onOpenChange={onOpenChange}
        title="ทดสอบ Error Handling"
        onSubmit={badSubmit}
      >
        <div>เนื้อหาฟอร์ม</div>
      </FormDialog>
    );

    const submitBtn = screen.getByRole("button", { name: "บันทึก" });
    expect(() => fireEvent.click(submitBtn)).not.toThrow();

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });

    errorSpy.mockRestore();
  });
});

