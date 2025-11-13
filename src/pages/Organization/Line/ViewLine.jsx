import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Flex, notification, Grid,  List,
  Divider,
  Skeleton,
  Avatar,
  Dropdown,
  Menu,Select,Modal } from "antd";
import Table from "../../../components/Common/Table";
import { GET, DELETE, POST } from "helpers/api_helper";
import { LINE, SEARCH, COLUMNCHANGE, SELECTEDCOLUMN } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import ColumnDropdown from "../../../components/Common/ColumnDropdown";
// import CommonSearch from "components/Common/Search";
// import { debounce } from "lodash";
import SwipeablePanel from "components/Common/SwipeablePanel";
import { EllipsisOutlined,SearchOutlined,ReloadOutlined,PlusOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import LineCollapseContent from "components/Common/LineCollapseContent";
import { Switch,FloatButton } from "antd";
import reorderIcon from "../../../assets/up-and-down-arrow.png";



let header = [
  {
    label: "S.No",
    value: "index",
  },
  {
    label: "Branch Name",
    value: "branch_name",
    sort: true,
    filter: true,
    filterSearch: true,
  },
  {
    label: "Line Name",
    value: "lineName",
    sort: true,
    filter: true,
    filterSearch: true,
  },
  {
    label: "Line Type",
    value: "lineType",
    sort: true,
    filter: true,
    filterSearch: true,
  },
  { label: "No of Installment", value: "installment", sort: true },
  { label: "Bad Loan Installment", value: "badinstallment", sort: true },
  { label: "Actions", value: "actions" },
];

const hiddenColumns = ["move", "order", "actions", "index"];

const ViewLine = () => {
  const navigate = useNavigate();
  const [reOrder, setReorder] = useState(false);
  const [rowReorderred, setRowReorderred] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [order, setOrder] = useState({});
  const [tableHeader, setTableHeader] = useState(header);
  const [api, contextHolder] = notification.useNotification();
  const [tableLoader, setTableLoader] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteLoader, setDeleteLoader] = useState(false);
  const [reorderLoader, setReorderLoader] = useState(false);
  const [filterOption, setFilterOption] = useState({
    lineType: [
      { text: "Daily", value: "daily" },
      { text: "Weekly", value: "weekly" },
      { text: "Monthly", value: "monthly" },
    ],
  });
  const [selectedColumn, setSelectedColumn] = useState([]);
const [isDragMode, setIsDragMode] = useState(true); // switch toggle state
const [branchModalVisible, setBranchModalVisible] = useState(false);
const [selectedBranch, setSelectedBranch] = useState(null);
const [branchOptions, setBranchOptions] = useState([]);
const [originalData, setOriginalData] = useState([]); // ✅ store full data
const [searchModalVisible, setSearchModalVisible] = useState(false);
const [searchText, setSearchText] = useState("");
const [showReset, setShowReset] = useState(false);


  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [lineDetails, setLineDetails] = useState({});

  useEffect(() => {
    getSelectedColumn();
    getLineList();
  }, []);

  const sortData = (order) => {
    if (Object.keys(order).length > 0) {
      const reorderedData = [...tableData];
      Object.keys(order).forEach((value) => {
        const index = reorderedData.findIndex(
          (item) => item.id === parseInt(value)
        );
        if (index !== -1) {
          const [movedItem] = reorderedData.splice(index, 1);
          reorderedData.splice(order[value] - 1, 0, movedItem);
        }
      });

      return reorderedData;
    }
  };

  const SumbitReorder = async () => {
    try {
      setReorderLoader(true);
      const reorderedData =
        Object.keys(order)?.length > 0 ? sortData(order) : tableData;
      const response = await POST(`${LINE}reorder/`, reorderedData);
      if (response?.status === 200) {
        setTableData(reorderedData);
        setReorder(false);
        setRowReorderred(false);
        console.log(rowReorderred);
        const filtered = header.filter(
          (item) => !["move", "order"].includes(item.value)
        );
        setTableHeader(filtered);
        setOrder({});
        setShowReset(true);
        api.success({
          message: "Re-Ordered",
          description: "The order has been updated successfully. ",
          duration: 0,
        });
      } else {
        api.error({
          message: "Re-Ordered",
          description: "Failed to update the order",
          duration: 0,
        });
      }
      setReorderLoader(false);
    } catch (e) {
      setReorderLoader(false);
      notification.error({
        message: "Error",
        description: "Failed to update the order",
      });
    }
  };
  const handleReset = () => {
  setTableData(originalData);
  setShowReset(false);
  setSelectedBranch(null); 
  setSearchText("")
  notification.success({
    message: "Data Reset",
    description: "Restored to the original order successfully.",
  });
};


const getLineList = async () => {
  try {
    setTableLoader(true);
    const response = await GET(LINE);
    if (response?.status === 200) {
      setTableData(response.data);
      setOriginalData(response.data); // ✅ save full list here

      const filterCol = ["branch_name", "lineName"];
      const uniqueOptions = {};
      filterCol.forEach((col) => {
        uniqueOptions[col] = new Set();
      });

      response.data.forEach((item) => {
        filterCol.forEach((col) => {
          uniqueOptions[col].add(item[col]);
        });
      });

      filterCol.forEach((col) => {
        setFilterOption((prev) => ({
          ...prev,
          [col]: Array.from(uniqueOptions[col]).map((value) => ({
            text: value,
            value: value,
          })),
        }));
      });

      // Populate branch list
      const uniqueBranches = [
        ...new Set(response.data.map((item) => item.branch_name)),
      ];
      setBranchOptions(uniqueBranches.map((b) => ({ label: b, value: b })));
    } else {
      setTableData([]);
      setOriginalData([]);
    }
  } catch (error) {
    setTableData([]);
    setOriginalData([]);
  } finally {
    setTableLoader(false);
  }
};


  const clickReorder = () => {
     setBranchModalVisible(true);
    
    console.log(tableHeader)
    setTableHeader((prev) => {
      return [
        { label: "Move", value: "move" },
        { label: "Order", value: "order" },
        ...prev,
      ];
    });
  };

  const handleReOrder = (event, row) => {
    event.preventDefault();
    setRowReorderred(true);
    setOrder((prev) => ({ ...prev, [row.id]: event.target.value }));
  };

  const handleDragEnd = (data) => {
    setTableData(data);
    setRowReorderred(true);
  };

 const handleCancel = () => {
  const filtered = header.filter(
    (item) => !["move", "order"].includes(item.value)
  );
  setTableHeader(filtered);
  setReorder(false);
  setSelectedBranch(null);
  setTableData(originalData); // ✅ restore full data
};


  const onDelete = async (record) => {
    try {
      setDeleteLoader(true);
      const response = await DELETE(`${LINE}${record.id}/`);
      if (response?.status === 200) {
        const updatedData = tableData.filter((item) => item.id !== record.id);
        setTableData(updatedData);
        api.success({
          message: `${record?.lineName.toUpperCase()} Line Deleted!`,
          description: "The line has been deleted successfully ",
          duration: 0,
        });
      } else {
        api.error({
          message: "Line Delete",
          description: "The line is not deleted ",
          duration: 0,
        });
      }
      setDeleteLoader(false);
      setShowConfirm(false);
    } catch (error) {
      setDeleteLoader(false);
      setShowConfirm(false);
      api.success({
        message: "Line Deleted",
        description: "The line is not deleted ",
        duration: 0,
      });
    }
  };
// const debouncedSearch = debounce(async (searchedvalue) => {
//   setTableLoader(true);
//   try {
//     const response = await GET(`${SEARCH}?module=line&&searchText=${searchedvalue}`);
//     if (response?.status === 200) {
//       const data = response.data || [];

//       // ✅ Update main data list
//       setTableData(data);

//       // ✅ Optionally update backup/original data
//       setOriginalData(data);

//       // ✅ Rebuild branch options (still useful)
//       const uniqueBranches = [...new Set(data.map((item) => item.branch_name))];
//       setBranchOptions(uniqueBranches.map((b) => ({ label: b, value: b })));

//       setTableLoader(false);
//       if (data.length === 0) {
//         api.warning({
//           message: "No Results",
//           description: `No lines found for "${searchedvalue}".`,
//         });
//       }
//     } else {
//       setTableLoader(false);
//       api.error({
//         message: "Error",
//         description: "No Line Found",
//       });
//     }
//   } catch (error) {
//     setTableLoader(false);
//     api.error({
//       message: "Error",
//       description: "Search failed. Please try again.",
//     });
//   }
// }, 700);

  const handleColumnChange = async (value) => {
    try {
      const res = await POST(COLUMNCHANGE, {
        entity: "line",
        columns: value,
      });
      setSelectedColumn(value);
      if (res.status === 200) {
        getLineList();
      }
    } catch (error) {
      throw error;
    }
  };

  const getSelectedColumn = async () => {
    try {
      const res = await GET(SELECTEDCOLUMN);
      if (res.status === 200) {
        setSelectedColumn(res?.data?.line || []);
      }
    } catch (error) {
      throw error;
    }
  };
  const handleAction = (line) => {
    setLineDetails((prev) => ({
      ...prev,
      [line.id]: {
        ...prev[line.id],
        expanded: !prev[line.id]?.expanded,
        data: line,
      },
    }));
  };

const handleBranchSubmit = () => {
  if (!selectedBranch) {
    notification.warning({
      message: "Select a Branch",
      description: "Please choose a branch before continuing.",
    });
    return;
  }

  // ✅ Filter data temporarily
  const filteredData = originalData.filter(
    (item) => item.branch_name === selectedBranch
  );

  setTableData(filteredData);

  setBranchModalVisible(false);
  setReorder(true);
  setTableHeader((prev) => [
    { label: "Move", value: "move" },
    { label: "Order", value: "order" },
    ...prev,
  ]);
};
const handleSearch = () => {
  const query = searchText.trim().toLowerCase();

  if (!query) {
    // ✅ if empty, reset to full data
    setTableData(originalData);
    setSearchModalVisible(false);
    notification.info({
      message: "Reset Search",
      description: "Showing all lines again.",
    });
    return;
  }

  // ✅ Filter from originalData with partial + case-insensitive match
  const filtered = originalData.filter((item) => {
    const lineName = (item.lineName || "").toLowerCase();
    const branch = (item.branchName || "").toLowerCase();
    const lineType = (item.lineType || "").toLowerCase();

    // ✅ Match if query is part of lineName, branch, or lineType
    return (
      lineName.includes(query) ||
      branch.includes(query) ||
      lineType.includes(query)
    );
  });

  setTableData(filtered);
  setSearchModalVisible(false);
setShowReset(true);
  if (filtered.length === 0) {
    notification.warning({
      message: "No Results",
      description: `No matches found for "${searchText}".`,
    });
  } else {
    notification.success({
      message: "Search Complete",
      description: `${filtered.length} result(s) found for "${searchText}".`,
    });
  }
};


// Branch selection modal
const branchSelectionModal = (
  <Modal
    title="Select Branch for Re-Ordering"
    open={branchModalVisible}
    onOk={handleBranchSubmit}
    onCancel={() => setBranchModalVisible(false)}
    okText="Continue"
  >
    <p style={{ marginBottom: 10 }}>Choose a branch to view its line list:</p>
    <Select
      style={{ width: "100%" }}
      placeholder="Select Branch"
      options={branchOptions}
      value={selectedBranch}
      onChange={setSelectedBranch}
      showSearch
      optionFilterProp="label"
    />
  </Modal>
);
const searchModal = (
 <Modal
    title={<div style={{ textAlign: "center", width: "100%" }}>Search Line</div>}
    open={searchModalVisible}
    onOk={handleSearch}
    onCancel={() => setSearchModalVisible(false)}
    okText="Search">

    <p style={{ marginBottom: 10 ,fontWeight: 500 }}>Line Name </p>
    <input
      type="text"
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
      placeholder="Enter line name to search"
      style={{
        width: "100%",
        padding: "8px 10px",
        borderRadius: "6px",
        border: "1px solid #d9d9d9",
        outline: "none",
      }}
    />
  </Modal>
);



  const handleEditLine = (line) => navigate(`/line/edit/${line.id}`);
  return (
    <div className="page-content"style={{ paddingTop: 0, marginTop: 0 }}>
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 0,
    marginBottom: "10px",
  }}
>
  <h2 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>All Lines</h2>

  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    {!reOrder && (
      <>
        <Button
          
          onClick={clickReorder}
          disabled={reOrder}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            width: "32px"
          }}
        >
          <img
            src={reorderIcon}
            alt="Reorder Icon"
            style={{ width: "16px", height: "16px" }}
          />
        </Button>
         {/* ✅ Reset button shown only after reorder submit */}
        {showReset && (
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            title="Reset to Original"
          />
        )}

        {/* ✅ Search button now beside reorder */}
        <Button
          icon={<SearchOutlined />}
          onClick={() => setSearchModalVisible(true)}
          type="default"
        >
         {!isMobile && "Search"} 
        </Button>

       
      </>
    )}
  </div>
</div>



    {branchSelectionModal}
{searchModal}

      {tableLoader && <Loader />}
      {contextHolder}
      <Flex justify="space-between" wrap="wrap">
        
        

        <Flex gap="middle">
          {!isMobile && (
            <ColumnDropdown
              options={header.filter(
                (list) => !hiddenColumns.includes(list?.value)
              )}
              onChange={handleColumnChange}
              name={"line_column"}
              selectedColumn={selectedColumn}
            />
          )}
         
        </Flex>
      </Flex>

      {/* {isMobile && reOrder && (
        <Table
          data={tableData}
          reOrder={reOrder}
          Header={tableHeader}
          filterOption={filterOption}
          handleReOrder={handleReOrder}
          handleDragEnd={handleDragEnd}
          onDelete={onDelete}
          deleteLoader={deleteLoader}
          setShowConfirm={setShowConfirm}
          showConfirm={showConfirm}
          name={"line"}
        />
      )}

      {isMobile && !reOrder && (
        <GenericCollapse
          titleKey="lineName"
          data={tableData}
          contentKeys={[
            "id",
            "lineType",
            "installment",
            "badinstallment",
            "branch_name",
            "lineOrder",
          ]}
          onDelete={onDelete}
          name="line"
        />
      )}

      {!isMobile && (
        <Table
          data={tableData}
          reOrder={reOrder}
          Header={tableHeader.filter(
            (list) =>
              selectedColumn.includes(list.value) ||
              hiddenColumns.includes(list.value)
          )}
          filterOption={filterOption}
          handleReOrder={handleReOrder}
          handleDragEnd={handleDragEnd}
          onDelete={onDelete}
          deleteLoader={deleteLoader}
          setShowConfirm={setShowConfirm}
          showConfirm={showConfirm}
          name={"line"}
        />
      )} */}

{reOrder && !branchModalVisible ? (
  <div>
    {/* Switch Toggle */}
    {selectedBranch && (
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "10px",
          color: "#1677ff",
        }}
      >
        Reordering for Branch: {selectedBranch}
      </h3>
    )}
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
      
      <Switch
        checked={isDragMode}
        onChange={(checked) => setIsDragMode(checked)}
      /><span style={{ marginRight: 8, fontWeight: 500 }}>Slide</span>
    </div>

    {/* Separate table for desktop and mobile */}
    {isMobile ? (
      <Table
        data={tableData}
        reOrder={isDragMode}
        Header={
          isDragMode
            ? [
                { label: "Move", value: "move" },
                { label: "S.No", value: "index" },
                { label: "Line Name", value: "lineName" },
              ]
            : [
                { label: "Order", value: "order" },
                { label: "S.No", value: "index" },
                { label: "Line Name", value: "lineName" },
              ]
        }
        filterOption={filterOption}
        handleDragEnd={isDragMode ? handleDragEnd : undefined}
        handleReOrder={!isDragMode ? handleReOrder : undefined}
        deleteLoader={deleteLoader}
        setShowConfirm={setShowConfirm}
        showConfirm={showConfirm}
        name="line"
      />
    ) : (
      <Table
        data={tableData}
        reOrder={isDragMode}
        Header={
          isDragMode
            ? [
                { label: "Move", value: "move" },
                { label: "S.No", value: "index" },
                { label: "Line Name", value: "lineName" },
              ]
            : [
                { label: "Order", value: "order" },
                { label: "S.No", value: "index" },
                { label: "Line Name", value: "lineName" },
              ]
        }
        filterOption={filterOption}
        handleDragEnd={isDragMode ? handleDragEnd : undefined}
        handleReOrder={!isDragMode ? handleReOrder : undefined}
        deleteLoader={deleteLoader}
        setShowConfirm={setShowConfirm}
        showConfirm={showConfirm}
        name="line"
      />
    )}

    {/* Buttons */}
    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
      <Button
        type="primary"
        onClick={SumbitReorder}
        loading={reorderLoader}
        disabled={reorderLoader}
      >
        Submit
      </Button>
      <Button onClick={handleCancel}>Cancel</Button>
    </div>
  </div>
) : (
  // 📋 LIST VIEW (default view)
  <div
    id="scrollableDiv"
    style={{

      height: 400,
      overflow: "auto",
      padding: 0,
      marginTop: 20,
    }}
  >
    <InfiniteScroll
      dataLength={tableData.length}
      style={{ padding: "0 10px" }}
      next={getLineList}
      hasMore={false}
      loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
      endMessage={<Divider plain>End of List ✅</Divider>}
      scrollableTarget="scrollableDiv"
    >
      <List
        dataSource={tableData}
        renderItem={(line) => {
          const isExpanded = lineDetails[line.id]?.expanded;

          return (
            <div
              key={line.id}
              style={{
                borderBottom: "2px solid #f0f0f0",
                padding: 0,
                marginLeft: "-10px",
                marginRight: "-10px",
              }}
            >
              {isMobile ? (
                // 📱 MOBILE VIEW
                <div style={{ marginLeft: "-10px", padding:0 }}>
                  <SwipeablePanel
                    item={{
                      ...line,
                      lineName:
                        line.lineName.length > 15
                          ? `${line.lineName.slice(0, 15)}...`
                          : line.lineName,
                    }}
                    index={line.id}
                    titleKey="lineName"
                    name="line"
                    avatarSrc={"/path/to/lineIcon.svg"}
                    onSwipeRight={
                      !isExpanded ? () => handleEditLine(line) : undefined
                    }
                    onSwipeLeft={!isExpanded ? () => onDelete(line) : undefined}
                    isExpanded={isExpanded}
                    onExpandToggle={() => handleAction(line)}
                    renderContent={() => <LineCollapseContent line={line} />}
                  />
                </div>
              ) : (
                // 💻 DESKTOP VIEW
                <>
                  <List.Item
                    onClick={() => handleAction(line)}
                    style={{
                      cursor: "pointer",
                      background: isExpanded ? "#f9f9f9" : "#fff",
                    }}
                  >
                    <List.Item.Meta
                      avatar={<Avatar src={"/path/to/lineIcon.svg"} />}
                      title={
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          <span
                            style={{ fontWeight: 600, color: "#1677ff" }}
                          >
                            {line.lineName}
                          </span>

                          <Dropdown
                            overlay={
                              <Menu>
                                <Menu.Item
                                  onClick={() => handleEditLine(line)}
                                >
                                  Edit
                                </Menu.Item>
                                <Menu.Item
                                  danger
                                  onClick={() => onDelete(line)}
                                >
                                  Delete
                                </Menu.Item>
                              </Menu>
                            }
                            trigger={["click"]}
                          >
                            <EllipsisOutlined
                              style={{
                                fontSize: "22px",
                                color: "#999",
                                cursor: "pointer",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Dropdown>
                        </div>
                      }
                    />
                  </List.Item>

                  {isExpanded && (
                    <div style={{ marginTop: 6, paddingLeft: 36 }}>
                      <LineCollapseContent line={line} />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        }}
      />
    </InfiniteScroll>
  </div>
)}
{!reOrder && (
  <FloatButton
    icon={<PlusOutlined />}
    type="primary"
    tooltip={<div>Add New Line</div>}
    onClick={() => navigate("/line/add")}
    style={{
        right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          position: "fixed", // ✅ prevents scroll-triggered shift
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",}}
  />
)}


    </div>
  );
};

export default ViewLine;
