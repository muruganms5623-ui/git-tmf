import React, { useContext, useState, useEffect } from "react";
import { Table, notification, Input, Popconfirm } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import dragIcon from "../../assets/drag.png";

const RowContext = React.createContext({});


/* ----------------------------------------------------------
    ⭐ FIXED: DRAGGABLE ROW — NO FLICKER, NO JUMPING 
------------------------------------------------------------ */
const DraggableBodyRow = ({ style, rowIndex, total, ...restProps }) => {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
    listeners,
  } = useSortable({
    id: restProps["data-row-key"],
    animateLayoutChanges: () => false,
  });

  let safeTransform = transform;

  if (isDragging && transform) {
    const y = transform.y;

    // ⭐ Block dragging above the first row
    if (rowIndex === 0 && y < 0) {
      safeTransform = { x: 0, y: 0 };
    }

    // ⭐ Block dragging below the last row
    if (rowIndex === total - 1 && y > 0) {
      safeTransform = { x: 0, y: 0 };
    }
  }

  return (
    <RowContext.Provider
      value={{
        setActivatorNodeRef,
        listeners,
      }}
    >
      <tr
        ref={setNodeRef}
        {...restProps}
        style={{
          ...style,
          transform: safeTransform ? CSS.Transform.toString(safeTransform) : undefined,
          transition,
          position: isDragging ? "relative" : undefined,
          zIndex: isDragging ? 999 : undefined,
        }}
      />
    </RowContext.Provider>
  );
};




/* ----------------------------------------------------------
    ⭐ FIXED DRAG HANDLE — No AntD Button, No Re-render Issues
------------------------------------------------------------ */
const DragHandle = () => {
  const { setActivatorNodeRef, listeners } = useContext(RowContext);

  return (
    <div
      ref={setActivatorNodeRef}
      {...listeners}
      style={{
        width: 22,
        height: 22,
        cursor: "grab",
        touchAction: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.stopPropagation()} // ⭐ prevent row click during drag
    >
      <img src={dragIcon} style={{ width: 14, height: 14, opacity: 0.8 }} alt="img" />
    </div>
  );
};


const TableList = ({
  data,
  Header,
  reOrder,
  filterOption,
  handleReOrder,
  handleDragEnd,
  loader,
  onDelete,
  name,
}) => {
  const [tableData, setTableData] = useState(data);
  const navigate = useNavigate();
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    setTableData(data);
  }, [data]);

  /* ----------------------------------------------------------
      ⭐ SENSORS (prevents accidental move on touch/click)
  ------------------------------------------------------------ */
 const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 4 }, // ⭐ avoid jitter on grab
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 120,
      tolerance: 3,
    },
  })
);


  /* ----------------------------------------------------------
      ⭐ FIXED: REAL DRAG END LOGIC
  ------------------------------------------------------------ */

  const [isDragging, setIsDragging] = useState(false);
const [limits, setLimits] = useState({ top: 0, bottom: 0 });

const onDragStart = (event) => {
  const table = document.querySelector(".ant-table-body");

  if (table) {
    const rect = table.getBoundingClientRect();
    setLimits({
      top: rect.top,
      bottom: rect.bottom,
    });
  }
};

const onDragMove = (event) => {
  if (!event.activatorEvent || !event.delta) return;

  const pointerY = event.activatorEvent.clientY;

  // Stop ABOVE first row
  if (pointerY < limits.top + 10) {
    event.over = null;
    event.delta.y = 0;
    return;
  }

  // Stop BELOW last row
  if (pointerY > limits.bottom - 10) {
    event.over = null;
    event.delta.y = 0;
    return;
  }
};


const onDragEnd = ({ active, over }) => {
  if (!over) return; // ⭐ blocked by onDragMove → ignore

  const oldIndex = tableData.findIndex((i) => i.id === active.id);
  const newIndex = tableData.findIndex((i) => i.id === over.id);

  if (oldIndex === newIndex) return;

  const reordered = arrayMove(tableData, oldIndex, newIndex);
  setTableData(reordered);
  handleDragEnd(reordered);
};




  const keys = {
    area: "areaName",
    line: "lineName",
    branch: "branch_name",
    user: "name",
  };

  /* ----------------------------------------------------------
      ⭐ COLUMNS (unchanged except move column)
  ------------------------------------------------------------ */
  const generateColumns = () =>
    Header.map((column) => ({
      title: column.label,
      dataIndex: column.value,
      key: column.value,
      width: column.value === "move" ? 40 : "auto",

      sorter: column.sort
        ? (a, b) => {
            if (typeof a[column.value] === "number") {
              return a[column.value] - b[column.value];
            }
            return a[column.value]?.localeCompare(b[column.value]) ?? 0;
          }
        : false,

      filters: column.filter ? filterOption[column.value] : null,
      onFilter: column.filter
        ? (value, record) => record[column.value]?.startsWith(value)
        : false,
      filterSearch: column.filterSearch,

      render: (record, row, index) => {
        if (column.value === "move") return <DragHandle />;

        if (column.value === "actions")
          return (
            <div className="actions d-flex gap-1">
              {(name === "branch" || name === "user") && (
                <span
                  className="mdi mdi-eye cursor-pointer edit-icon text-primary"
                  onClick={() => navigate(`/${name}/view/${row.id}`)}
                />
              )}
              <span
                className="mdi mdi-pencil cursor-pointer edit-icon text-secondary"
                onClick={() => navigate(`/${name}/edit/${row.id}`)}
              />
              <Popconfirm
                title={`Delete ${name} ${row?.[keys[name]]?.toUpperCase()}?`}
                description={"Are you sure you want to delete?"}
                icon={<QuestionCircleOutlined style={{ color: "red" }} />}
                onConfirm={() => onDelete(row)}
                placement="topLeft"
              >
                <span className="mdi mdi-delete cursor-pointer delete-icon" />
              </Popconfirm>
            </div>
          );

        if (column.value === "index") return index + 1;

        if (column.value === "order")
          return <Input onChange={(e) => handleReOrder(e, row)} />;

        return <>{record}</>;
      },
    }));

  /* ----------------------------------------------------------
      ⭐ FINAL JSX
  ------------------------------------------------------------ */
  return (
    <div>
      {contextHolder}

      {reOrder ? (
        <DndContext
          sensors={sensors}
          modifiers={[restrictToVerticalAxis]}
onDragStart={onDragStart}
            onDragMove={onDragMove}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={tableData.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table
              dataSource={tableData}
              columns={generateColumns()}
              rowKey="id"
              pagination={false}
              bordered
              components={{
  body: {
    row: (props) => {
      const rowIndex = tableData.findIndex(
        (r) => r.id === props["data-row-key"]
      );
      return <DraggableBodyRow {...props} rowIndex={rowIndex} total={tableData.length} />;
    },
  },
}}

              scroll={{ x: "100%" }}
            />
          </SortableContext>
        </DndContext>
      ) : (
        <div
  style={{
    height: isDragging ? "100%" : "auto",
    overflow: "hidden",
  }}
>
        <Table
          dataSource={tableData}
          columns={generateColumns()}
          rowKey="id"
          pagination={false}
          bordered
          scroll={{ x: "100%" }}
          loading={loader}
        />
        </div>
      )}
    </div>
  );
};

export default TableList;
