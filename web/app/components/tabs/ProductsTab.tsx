"use client";

import React, { useState } from "react";
import {
  IconPackage,
  IconSearch,
  IconPlus,
  IconSparkles,
  IconPencil,
  IconTrash,
  IconFilter,
} from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Input, Textarea } from "../ui/Input";
import { Select } from "../ui/Select";
import { PageHeader } from "../layout/PageHeader";

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  specs: string;
  price: string;
  stock: "In Stock" | "Low Stock" | "Pre-order";
  warranty: string;
}

export interface ProductsTabProps {
  products: ProductItem[];
  productSearch: string;
  setProductSearch: (s: string) => void;
  isAddingProduct: boolean;
  setIsAddingProduct: (b: boolean) => void;
  editingProduct: ProductItem | null;
  setEditingProduct: React.Dispatch<React.SetStateAction<ProductItem | null>> | ((p: ProductItem | null) => void);
  newProduct: Partial<ProductItem>;
  setNewProduct: React.Dispatch<React.SetStateAction<Partial<ProductItem>>> | ((p: Partial<ProductItem>) => void);
  onSaveProduct: () => void;
  onDeleteProduct: (p: any) => void;
  onExtractProducts: () => void;
  busy: boolean;
}

export function ProductsTab({
  products,
  productSearch,
  setProductSearch,
  isAddingProduct,
  setIsAddingProduct,
  editingProduct,
  setEditingProduct,
  newProduct,
  setNewProduct,
  onSaveProduct,
  onDeleteProduct,
  onExtractProducts,
  busy,
}: ProductsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const filteredProducts = products.filter((prod) => {
    if (selectedCategory !== "all" && prod.category !== selectedCategory) return false;
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      prod.name.toLowerCase().includes(q) ||
      prod.category.toLowerCase().includes(q) ||
      prod.specs.toLowerCase().includes(q) ||
      prod.id.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        breadcrumbs="SALES / PRODUCTS CATALOG"
        title="Mahsulotlar Katalogi"
        description="Do'kondagi barcha tovarlar, narxlar va qoldiqlar. AI ushbu bazadan foydalanib mijozlarga sotadi."
        badge={{ text: `${products.length} ta mahsulot`, variant: "accent" }}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExtractProducts}
              disabled={busy}
              icon={<IconSparkles size={14} style={{ color: "var(--accent)" }} />}
            >
              Kanal postlaridan aniqlash
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddingProduct(true)}
              icon={<IconPlus size={15} />}
            >
              Yangi mahsulot
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader
          actions={
            <div className="d-flex align-items-center gap-2">
              {/* Category Filter */}
              {categories.length > 0 && (
                <div className="d-flex align-items-center gap-1.5">
                  <IconFilter size={14} className="text-secondary" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="linear-input py-1"
                    style={{ width: "auto", fontSize: "0.78rem" }}
                  >
                    <option value="all">Barcha toifalar</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search */}
              <div className="position-relative" style={{ width: "200px" }}>
                <IconSearch
                  size={14}
                  className="position-absolute start-0 ms-2.5 top-50 translate-middle-y text-secondary"
                />
                <input
                  type="text"
                  placeholder="Mahsulot izlash..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="linear-input ps-5 py-1"
                  style={{ fontSize: "0.78rem" }}
                />
              </div>
            </div>
          }
        >
          <CardTitle>Tovarlar Ro'yxati ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-responsive">
            <table className="linear-table">
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>Kodi</th>
                  <th>Mahsulot Nomi</th>
                  <th>Kategoriya</th>
                  <th>Xususiyatlari (Specs)</th>
                  <th>Narxi</th>
                  <th>Holati</th>
                  <th>Kafolat</th>
                  <th style={{ textAlign: "right" }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-secondary py-5 small">
                      Mahsulot topilmadi. Yangi mahsulot qo'shing yoki Telegram postlaridan aniqlang.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => (
                    <tr key={prod.id}>
                      <td className="font-monospace text-secondary small">
                        {prod.id}
                      </td>
                      <td className="fw-semibold text-primary">
                        {prod.name}
                      </td>
                      <td>
                        <Badge variant="accent">{prod.category}</Badge>
                      </td>
                      <td className="text-secondary small text-truncate" style={{ maxWidth: "260px" }}>
                        {prod.specs}
                      </td>
                      <td className="fw-bold text-success font-monospace">
                        {prod.price}
                      </td>
                      <td>
                        {prod.stock === "In Stock" ? (
                          <Badge variant="success">Mavjud</Badge>
                        ) : prod.stock === "Low Stock" ? (
                          <Badge variant="warning">Kam qoldi</Badge>
                        ) : (
                          <Badge variant="info">Buyurtmaga</Badge>
                        )}
                      </td>
                      <td className="text-secondary small">{prod.warranty}</td>
                      <td style={{ textAlign: "right" }}>
                        <div className="d-flex align-items-center justify-content-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => setEditingProduct(prod)}
                            icon={<IconPencil size={13} />}
                          />
                          <Button
                            variant="danger"
                            size="xs"
                            onClick={() => onDeleteProduct(prod)}
                            icon={<IconTrash size={13} />}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Product Modal */}
      {(editingProduct || isAddingProduct) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setEditingProduct(null);
            setIsAddingProduct(false);
          }}
          title={editingProduct ? `${editingProduct.name} — Tahrirlash` : "Yangi Mahsulot Qo'shish"}
          size="md"
          footer={
            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddingProduct(false);
                }}
              >
                Bekor qilish
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onSaveProduct}
              >
                Saqlash
              </Button>
            </div>
          }
        >
          {editingProduct ? (
            <div className="d-flex flex-column gap-3">
              <Input
                label="Mahsulot Nomi"
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                required
              />
              <div className="row g-2">
                <div className="col-6">
                  <Select
                    label="Kategoriya"
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    options={[
                      { value: "Gaming", label: "Gaming" },
                      { value: "Business", label: "Business" },
                      { value: "Ultrabook", label: "Ultrabook" },
                      { value: "Premium", label: "Premium" },
                    ]}
                  />
                </div>
                <div className="col-6">
                  <Input
                    label="Narxi"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    placeholder="$450 yoki 5,200,000 so'm"
                    required
                  />
                </div>
              </div>
              <Textarea
                label="Xususiyatlari (Specs)"
                rows={2}
                value={editingProduct.specs}
                onChange={(e) => setEditingProduct({ ...editingProduct, specs: e.target.value })}
              />
              <div className="row g-2">
                <div className="col-6">
                  <Select
                    label="Holati"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value as any })}
                    options={[
                      { value: "In Stock", label: "Mavjud (In Stock)" },
                      { value: "Low Stock", label: "Kam qoldi (Low Stock)" },
                      { value: "Pre-order", label: "Buyurtmaga (Pre-order)" },
                    ]}
                  />
                </div>
                <div className="col-6">
                  <Input
                    label="Kafolat"
                    value={editingProduct.warranty}
                    onChange={(e) => setEditingProduct({ ...editingProduct, warranty: e.target.value })}
                    placeholder="3 oy kafolat"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              <Input
                label="Mahsulot Nomi"
                value={newProduct.name || ""}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Masalan: Lenovo Legion 5 Pro"
                required
              />
              <div className="row g-2">
                <div className="col-6">
                  <Select
                    label="Kategoriya"
                    value={newProduct.category || "Gaming"}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    options={[
                      { value: "Gaming", label: "Gaming" },
                      { value: "Business", label: "Business" },
                      { value: "Ultrabook", label: "Ultrabook" },
                      { value: "Premium", label: "Premium" },
                    ]}
                  />
                </div>
                <div className="col-6">
                  <Input
                    label="Narxi"
                    value={newProduct.price || ""}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="$650"
                    required
                  />
                </div>
              </div>
              <Textarea
                label="Xususiyatlari (Specs)"
                rows={2}
                value={newProduct.specs || ""}
                onChange={(e) => setNewProduct({ ...newProduct, specs: e.target.value })}
                placeholder="i7-12700H, 16GB RAM, 512GB SSD, RTX 3060"
              />
              <div className="row g-2">
                <div className="col-6">
                  <Select
                    label="Holati"
                    value={newProduct.stock || "In Stock"}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value as any })}
                    options={[
                      { value: "In Stock", label: "Mavjud (In Stock)" },
                      { value: "Low Stock", label: "Kam qoldi (Low Stock)" },
                      { value: "Pre-order", label: "Buyurtmaga (Pre-order)" },
                    ]}
                  />
                </div>
                <div className="col-6">
                  <Input
                    label="Kafolat"
                    value={newProduct.warranty || "2 oy kafolat"}
                    onChange={(e) => setNewProduct({ ...newProduct, warranty: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
