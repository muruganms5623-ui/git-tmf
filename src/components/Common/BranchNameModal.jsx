import React, { useEffect, useState } from "react";
import { Modal, Form, Select, Spin, notification } from "antd";
import { GET_BRANCHES } from "helpers/api_helper";
import { ADD_BRANCH } from "helpers/url_helper";

const BranchNameModal = ({ visible, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [branchList, setBranchList] = useState([]);

  // Fetch branches inside modal
  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await GET_BRANCHES(ADD_BRANCH);

      if (response?.status === 200) {
        setBranchList(response.data);
      } else {
        notification.error({
          message: "Failed to Load Branches",
          description: "Could not fetch branch list.",
        });
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches only when modal opens
  useEffect(() => {
    if (visible) {
      form.resetFields();
      fetchBranches();
    }
  }, [visible]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSave(values.branchName);
    });
  };

  return (
    <Modal
      title="Select Your Branch"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      okText="Save"
      width={450}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="branchName"
          label="Branch Name"
          rules={[{ required: true, message: "Please select your branch" }]}
        >
          {loading ? (
            <Spin />
          ) : (
            <Select
              placeholder="Select your branch"
              options={branchList.map((b) => ({
                label: b.branch_name,
                value: b.branch_name,
              }))}
              showSearch
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
            />
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BranchNameModal;
